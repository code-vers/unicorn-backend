import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { UserValidation } from './user.validation';
import { createErrorResponse, createPaginatedResponse, createSuccessResponse, Error400, Error401, Error403, Error404, Error500 } from '../../utils/swaggerHelpers';

export const registerUserSwagger = (registry: OpenAPIRegistry, bearerAuth: any) => {
  const UserProfileSchema = z.object({
    id: z.string().openapi({ example: 'uuid-1234' }),
    name: z.string().openapi({ example: 'John Doe' }),
    email: z.string().openapi({ example: 'john@example.com' }),
    role: z.string().openapi({ example: 'USER' }),
    createdAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' })
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/me',
    tags: ['Users'],
    summary: 'Get current user profile',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: createSuccessResponse(UserProfileSchema, 'User profile retrieved successfully', 'User profile retrieved successfully.'),
      401: Error401,
      404: Error404,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/users',
    tags: ['Users'],
    summary: 'Get all users',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        searchTerm: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.string().optional()
      })
    },
    responses: {
      200: createPaginatedResponse(UserProfileSchema, 'Users retrieved successfully', 'Users retrieved successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}/role',
    tags: ['Users'],
    summary: 'Change user role',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'User ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': {
            schema: (UserValidation.changeRole as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(
        z.object({
          id: z.string().openapi({ example: 'uuid-1234' }),
          name: z.string().openapi({ example: 'John Doe' }),
          email: z.string().openapi({ example: 'john@example.com' }),
          role: z.string().openapi({ example: 'ADMIN' })
        }),
        'User role updated successfully',
        'User role updated successfully.'
      ),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
