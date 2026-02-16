import { Router } from 'express';
import * as product from '../controllers/product.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadPhotos } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rateLimit';
import { productRegistrationSchema } from '../types/validation';

const router = Router();

// Public: list available models and sources
router.get('/models', product.listModels);
router.get('/sources', product.listSources);

// Authenticated: product registration
router.post(
  '/register',
  authenticate,
  uploadLimiter,
  uploadPhotos.array('photos', 5),
  validate(productRegistrationSchema),
  product.registerProduct
);
router.get('/my', authenticate, product.getMyProducts);
router.get('/:id', authenticate, product.getProduct);
router.post(
  '/:id/photos',
  authenticate,
  uploadLimiter,
  uploadPhotos.array('photos', 5),
  product.addPhotos
);

export default router;
