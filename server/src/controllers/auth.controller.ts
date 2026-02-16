import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { generateOtp, storeOtp, verifyOtp } from '../utils/otp';
import { generateAccessToken, generateRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../utils/tokens';
import { sendOtpEmail, sendOtpSms, sendPasswordResetEmail } from '../services/notification';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY = 60 * 60; // 1 hour in seconds

export async function register(req: Request, res: Response): Promise<void> {
  const { email, phone, password, firstName, lastName } = req.body;

  // Check if user already exists
  const identifier = email || phone;
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existing) {
    res.status(409).json({ success: false, error: 'An account with this email or phone already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: email || null,
      phone: phone || null,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      consentAt: new Date(),
    },
  });

  // Generate and send OTP
  const otp = generateOtp();
  await storeOtp(identifier, otp);

  if (email) {
    await sendOtpEmail(email, otp);
  } else if (phone) {
    await sendOtpSms(phone, otp);
  }

  logger.info('User registered', { userId: user.id });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your account with the OTP sent.',
    data: { userId: user.id },
  });
}

export async function verifyOtpHandler(req: Request, res: Response): Promise<void> {
  const { identifier, otp } = req.body;

  const isValid = await verifyOtp(identifier, otp);

  if (!isValid) {
    res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    return;
  }

  // Find user by email or phone
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  // Mark as verified
  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  // Issue tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = await generateRefreshToken(user.id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { identifier, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
      deletedAt: null,
    },
  });

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  if (!user.isVerified) {
    // Resend OTP for unverified users
    const otp = generateOtp();
    await storeOtp(identifier, otp);
    if (user.email) await sendOtpEmail(user.email, otp);
    else if (user.phone) await sendOtpSms(user.phone, otp);

    res.status(403).json({
      success: false,
      error: 'Account not verified. A new OTP has been sent.',
      data: { requiresVerification: true },
    });
    return;
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = await generateRefreshToken(user.id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    },
  });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { identifier } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
      deletedAt: null,
    },
  });

  // Always return success to prevent user enumeration
  if (!user || !user.email) {
    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`reset:${resetToken}`, RESET_TOKEN_EXPIRY, user.id);

  await sendPasswordResetEmail(user.email, resetToken);

  res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;

  const userId = await redis.get(`reset:${token}`);
  if (!userId) {
    res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Invalidate reset token
  await redis.del(`reset:${token}`);

  // Revoke all existing refresh tokens (force re-login)
  await prisma.refreshToken.deleteMany({ where: { userId } });

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ success: false, error: 'No refresh token provided' });
    return;
  }

  const result = await rotateRefreshToken(token);
  if (!result) {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    return;
  }

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: { accessToken: result.accessToken },
  });
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (token) {
    await revokeRefreshToken(token);
  }

  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out' });
}
