import { Router } from 'express';
import * as support from '../controllers/support.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadAttachments } from '../middleware/upload';
import { createTicketSchema, ticketMessageSchema } from '../types/validation';

const router = Router();

router.post('/tickets', authenticate, validate(createTicketSchema), support.createTicket);
router.get('/tickets', authenticate, support.listTickets);
router.get('/tickets/:id', authenticate, support.getTicket);
router.post(
  '/tickets/:id/messages',
  authenticate,
  uploadAttachments.array('attachments', 5),
  validate(ticketMessageSchema),
  support.sendMessage
);

export default router;
