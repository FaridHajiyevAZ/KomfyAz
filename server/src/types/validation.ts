import { z } from 'zod';

// ─── AUTH SCHEMAS ────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to data processing',
  }),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone number is required',
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(1), // email or phone
  otp: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const loginSchema = z.object({
  identifier: z.string().min(1), // email or phone
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/\d/),
});

// ─── PRODUCT REGISTRATION SCHEMAS ────────────────────────────

export const productRegistrationSchema = z.object({
  mattressModelId: z.string().uuid(),
  purchaseSourceId: z.string().uuid(),
  purchaseDate: z
    .string()
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d <= new Date();
    }, 'Purchase date cannot be in the future')
    .refine((date) => {
      const d = new Date(date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return d >= oneYearAgo;
    }, 'Purchase date cannot be older than 1 year'),
  receivedUndamaged: z.boolean().refine((v) => v === true, {
    message: 'You must confirm the product was received undamaged',
  }),
  infoAccurate: z.boolean().refine((v) => v === true, {
    message: 'You must confirm the information is accurate',
  }),
});

// ─── SUPPORT TICKET SCHEMAS ─────────────────────────────────

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  body: z.string().min(10).max(5000),
});

export const ticketMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

// ─── ADMIN SCHEMAS ───────────────────────────────────────────

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'INFO_REQUESTED']),
  reason: z.string().max(1000).optional(),
});

export const adminNoteSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const updateTicketTagsSchema = z.object({
  tags: z.array(z.string().max(50)).max(10),
});

// ─── PROFILE SCHEMAS ────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
});

// ─── QUERY SCHEMAS ──────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminRegistrationFilterSchema = paginationSchema.extend({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']).optional(),
  modelId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export const adminTicketFilterSchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductRegistrationInput = z.infer<typeof productRegistrationSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
