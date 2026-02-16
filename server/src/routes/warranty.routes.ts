import { Router } from 'express';
import * as warranty from '../controllers/warranty.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:registrationId', authenticate, warranty.getWarranty);

export default router;
