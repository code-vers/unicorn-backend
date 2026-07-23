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

const SupportTicketSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  subject: z.string(),
  message: z.string(),
  attachmentUrl: z.string().nullable(),
  status: z.enum(['PENDING', 'RESOLVED', 'CLOSED']),
  createdAt: z.string(),
  updatedAt: z.string()
});

const CreateSupportSchema = z.object({
  name: z.string().optional().openapi({ description: 'Optional if authenticated' }),
  email: z.string().optional().openapi({ description: 'Optional if authenticated' }),
  phone: z.string().optional(),
  subject: z.string(),
  message: z.string(),
  attachmentUrl: z.string().optional()
});

const UpdateSupportStatusSchema = z.object({
  status: z.enum(['PENDING', 'RESOLVED', 'CLOSED'])
});

export const registerSupportSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  // POST /support
  registry.registerPath({
    method: 'post',
    path: '/api/v1/support',
    tags: ['Support'],
    summary: 'Submit a support ticket or contact message',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': { schema: CreateSupportSchema }
        }
      }
    },
    responses: {
      201: createSuccessResponse(SupportTicketSchema, 'Support ticket submitted successfully', 'Support ticket submitted successfully.'),
      400: Error400,
      500: Error500
    }
  });

  // GET /support
  registry.registerPath({
    method: 'get',
    path: '/api/v1/support',
    tags: ['Support'],
    summary: 'Get all support tickets (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        searchTerm: z.string().optional(),
        status: z.enum(['PENDING', 'RESOLVED', 'CLOSED']).optional(),
        page: z.string().optional(),
        limit: z.string().optional()
      })
    },
    responses: {
      200: createPaginatedResponse(SupportTicketSchema, 'Tickets retrieved successfully', 'Tickets retrieved successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  // GET /support/:id
  registry.registerPath({
    method: 'get',
    path: '/api/v1/support/{id}',
    tags: ['Support'],
    summary: 'Get a single support ticket (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Ticket ID' })
      })
    },
    responses: {
      200: createSuccessResponse(SupportTicketSchema, 'Ticket retrieved successfully', 'Ticket retrieved successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // PATCH /support/:id/status
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/support/{id}/status',
    tags: ['Support'],
    summary: 'Update ticket status (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Ticket ID' })
      }),
      body: {
        content: {
          'application/json': { schema: UpdateSupportStatusSchema }
        }
      }
    },
    responses: {
      200: createSuccessResponse(SupportTicketSchema, 'Ticket status updated', 'Ticket status updated.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
