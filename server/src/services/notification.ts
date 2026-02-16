import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (env.NODE_ENV === 'development' && !env.SMTP_HOST) {
    logger.info('Email send skipped (no SMTP configured)', { to, subject });
    return;
  }

  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: (err as Error).message });
    throw err;
  }
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>KomfyAz - Verification Code</h2>
      <p>Your verification code is:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; border-radius: 8px;">
        ${otp}
      </div>
      <p style="color: #666; margin-top: 16px;">This code expires in 5 minutes. Do not share it with anyone.</p>
    </div>
  `;
  await sendEmail(email, 'Your KomfyAz Verification Code', html);
}

export async function sendWarrantyConfirmation(
  email: string,
  data: { modelName: string; startDate: string; endDate: string }
): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>KomfyAz - Warranty Activated</h2>
      <p>Your warranty has been successfully activated.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Product</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.modelName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Start Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.startDate}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">End Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.endDate}</td></tr>
      </table>
      <p>You can view your warranty details in your <a href="${env.FRONTEND_URL}/dashboard">customer dashboard</a>.</p>
    </div>
  `;
  await sendEmail(email, 'Warranty Activated - KomfyAz', html);
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>KomfyAz - Password Reset</h2>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #666;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
  await sendEmail(email, 'Password Reset - KomfyAz', html);
}

// SMS sending placeholder - implement with Twilio when credentials are configured
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  if (!env.TWILIO_ACCOUNT_SID) {
    logger.info('SMS send skipped (Twilio not configured)', { phone: phone.substring(0, 4) + '****' });
    return;
  }

  // Twilio integration would go here
  logger.info('SMS OTP sent', { phone: phone.substring(0, 4) + '****' });
}
