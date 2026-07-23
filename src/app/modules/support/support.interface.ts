import type { SupportStatus } from '@prisma/client';

export interface ISupportTicketPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  attachmentUrl?: string;
}

export interface ISupportQuery {
  searchTerm?: string;
  status?: SupportStatus;
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ISupportStatusUpdatePayload {
  status: SupportStatus;
}
