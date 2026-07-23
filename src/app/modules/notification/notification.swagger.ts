import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  Error400,
  Error401,
  Error403,
  Error404,
  Error500,
  createPaginatedResponse,
  createSuccessResponse
} from '../../utils/swaggerHelpers';

const NotificationSchema = z.object({
  id: z.string().openapi({ example: 'uuid-1234' }),
  userId: z.string().openapi({ example: 'user-uuid' }),
  title: z.string().openapi({ example: 'Booking Confirmed' }),
  message: z.string().openapi({ example: 'Your booking UC2023-1234 has been confirmed.' }),
  type: z.enum(['BOOKING', 'PAYMENT', 'SYSTEM', 'CHAUFFEUR']).openapi({ example: 'BOOKING' }),
  isRead: z.boolean().openapi({ example: false }),
  createdAt: z.string().openapi({ example: '2023-10-25T10:00:00Z' }),
  updatedAt: z.string().openapi({ example: '2023-10-25T10:00:00Z' })
});

export const registerNotificationSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  // GET /notifications
  registry.registerPath({
    method: 'get',
    path: '/api/v1/notifications',
    tags: ['Notifications'],
    summary: 'Get user notifications',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        isRead: z.string().optional()
      })
    },
    responses: {
      200: createPaginatedResponse(NotificationSchema, 'Notifications retrieved successfully', 'Notifications retrieved successfully.'),
      401: Error401,
      500: Error500
    }
  });

  // PATCH /notifications/read-all
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/notifications/read-all',
    tags: ['Notifications'],
    summary: 'Mark all notifications as read',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: createSuccessResponse(z.null(), 'All notifications marked as read successfully', 'All notifications marked as read successfully.'),
      401: Error401,
      500: Error500
    }
  });

  // PATCH /notifications/:id/read
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/notifications/{id}/read',
    tags: ['Notifications'],
    summary: 'Mark a notification as read',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Notification ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(NotificationSchema, 'Notification marked as read successfully', 'Notification marked as read successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
