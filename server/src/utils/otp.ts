import crypto from 'crypto';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from './logger';

const OTP_PREFIX = 'otp:';
const OTP_ATTEMPTS_PREFIX = 'otp_attempts:';

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function storeOtp(identifier: string, otp: string): Promise<void> {
  const key = `${OTP_PREFIX}${identifier}`;
  await redis.setex(key, env.OTP_EXPIRY_SECONDS, otp);
  // Reset attempts counter
  await redis.del(`${OTP_ATTEMPTS_PREFIX}${identifier}`);
  logger.debug('OTP stored', { identifier: identifier.substring(0, 3) + '***' });
}

export async function verifyOtp(identifier: string, otp: string): Promise<boolean> {
  const attemptsKey = `${OTP_ATTEMPTS_PREFIX}${identifier}`;
  const attempts = await redis.incr(attemptsKey);

  if (attempts === 1) {
    // Set expiry on first attempt
    await redis.expire(attemptsKey, env.OTP_EXPIRY_SECONDS);
  }

  if (attempts > env.OTP_MAX_ATTEMPTS) {
    // Clean up
    await redis.del(`${OTP_PREFIX}${identifier}`);
    await redis.del(attemptsKey);
    return false;
  }

  const key = `${OTP_PREFIX}${identifier}`;
  const storedOtp = await redis.get(key);

  if (!storedOtp || storedOtp !== otp) {
    return false;
  }

  // OTP verified, clean up
  await redis.del(key);
  await redis.del(attemptsKey);
  return true;
}
