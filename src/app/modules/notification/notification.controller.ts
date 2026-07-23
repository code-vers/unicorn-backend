import { RequestHandler } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { NotificationService } from './notification.service';
import { INotificationQuery } from './notification.interface';

const getUserNotifications: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const query = req.query as unknown as INotificationQuery;
  const result = await NotificationService.getUserNotifications(userId, query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notifications retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const markAsRead: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const userId = req.user!.userId;
  const result = await NotificationService.markAsRead(id, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notification marked as read successfully.',
    data: result
  });
});

const markAllAsRead: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  await NotificationService.markAllAsRead(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All notifications marked as read successfully.',
    data: null
  });
});

export const NotificationController = {
  getUserNotifications,
  markAsRead,
  markAllAsRead
};
