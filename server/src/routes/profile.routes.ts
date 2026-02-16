import { Router } from 'express';
import * as profile from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../types/validation';

const router = Router();

router.get('/', authenticate, profile.getProfile);
router.patch('/', authenticate, validate(updateProfileSchema), profile.updateProfile);

export default router;
