import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AuthPayload } from '../types';
import { UserRole } from '@prisma/client';

export function generateAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role } satisfies AuthPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      // Delete expired token
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    return null;
  }

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  // Issue new pair
  const accessToken = generateAccessToken(stored.userId, stored.user.role);
  const refreshToken = await generateRefreshToken(stored.userId);

  return { accessToken, refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
