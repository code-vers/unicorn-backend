import type { NotificationType } from '@prisma/client';

export interface INotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
}

export interface INotificationQuery {
  page?: string | number;
  limit?: string | number;
  isRead?: string | boolean;
}
