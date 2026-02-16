import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  updateRegistrationStatusSchema,
  adminNoteSchema,
  updateTicketStatusSchema,
  updateTicketTagsSchema,
  ticketMessageSchema,
  adminRegistrationFilterSchema,
  adminTicketFilterSchema,
  paginationSchema,
} from '../types/validation';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

// Dashboard stats
router.get('/stats', admin.getStats);

// Registration management
router.get('/registrations', validate(adminRegistrationFilterSchema, 'query'), admin.listRegistrations);
router.get('/registrations/:id', admin.getRegistrationDetail);
router.patch('/registrations/:id/status', validate(updateRegistrationStatusSchema), admin.updateRegistrationStatus);
router.post('/registrations/:id/notes', validate(adminNoteSchema), admin.addRegistrationNote);

// Fraud detection
router.get('/fraud/duplicates', admin.getDuplicates);

// Support ticket management
router.get('/tickets', validate(adminTicketFilterSchema, 'query'), admin.listAllTickets);
router.get('/tickets/:id', admin.getTicketDetail);
router.patch('/tickets/:id/status', validate(updateTicketStatusSchema), admin.updateTicketStatus);
router.post('/tickets/:id/messages', validate(ticketMessageSchema), admin.adminReplyTicket);
router.patch('/tickets/:id/tags', validate(updateTicketTagsSchema), admin.updateTicketTags);

// User management
router.get('/users', validate(paginationSchema, 'query'), admin.listUsers);
router.get('/users/:id', admin.getUserDetail);

export default router;
