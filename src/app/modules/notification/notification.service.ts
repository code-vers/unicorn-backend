import prisma from '../../utils/prisma';
import { QueryBuilder } from '../../utils/QueryBuilder';
import { INotificationPayload, INotificationQuery } from './notification.interface';
import AppError from '../../errors/AppError';

// Internal function to create a notification
const createNotification = async (payload: INotificationPayload) => {
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'SYSTEM'
    }
  });
  return notification;
};

// Get user notifications
const getUserNotifications = async (userId: string, query: INotificationQuery) => {
  const notifQuery = new QueryBuilder(query).filter().sort().paginate();
  const builtQuery = notifQuery.build();

  // Combine user ID filter with other filters
  const prismaQuery = {
    ...builtQuery,
    where: {
      ...builtQuery.where,
      userId
    }
  };

  const data = await prisma.notification.findMany(prismaQuery);
  const total = await prisma.notification.count({ where: prismaQuery.where });
  const take = builtQuery.take || 10;
  const skip = builtQuery.skip || 0;
  
  return {
    meta: {
      page: skip / take + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    },
    data
  };
};

// Mark a single notification as read
const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }
  if (notification.userId !== userId) {
    throw new AppError(403, 'Unauthorized');
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
};

// Mark all unread notifications as read for a user
const markAllAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
};

export const NotificationService = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};
