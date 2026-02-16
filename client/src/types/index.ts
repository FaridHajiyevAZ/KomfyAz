export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MattressModel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  warrantyMonths: number;
}

export interface PurchaseSource {
  id: string;
  name: string;
  type: string;
}

export interface ProductRegistration {
  id: string;
  mattressModel: { name: string; slug: string; warrantyMonths: number };
  purchaseSource: { name: string; type: string };
  purchaseDate: string;
  registrationStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED';
  warranty: {
    status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'VOIDED';
    startDate: string | null;
    endDate: string | null;
    activatedAt: string | null;
  } | null;
  photos: Array<{ id: string; type: string; originalFilename: string; createdAt: string }>;
  createdAt: string;
}

export interface Warranty {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'VOIDED';
  startDate: string | null;
  endDate: string | null;
  activatedAt: string | null;
  modelName: string;
  warrantyMonths: number;
  daysRemaining: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
  _count?: { messages: number };
}

export interface TicketMessage {
  id: string;
  senderType: 'customer' | 'admin';
  body: string;
  createdAt: string;
  attachments?: Array<{ id: string; originalFilename: string; mimeType: string }>;
}
