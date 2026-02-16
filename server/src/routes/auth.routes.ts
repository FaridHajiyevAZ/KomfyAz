import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimit';
import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../types/validation';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), auth.verifyOtpHandler);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), auth.resetPassword);
router.post('/refresh', auth.refresh);
router.post('/logout', authenticate, auth.logout);

export default router;
