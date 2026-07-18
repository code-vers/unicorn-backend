import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
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

const DriverSchema = z.object({
  id: z.string().openapi({ example: 'drv-1234' }),
  name: z.string().openapi({ example: 'John Doe' }),
  phoneNumber: z.string().openapi({ example: '+254700000000' }),
  whatsappNumber: z.string().openapi({ example: '+254700000000' }),
  photoUrl: z.string().nullable().openapi({ example: '/uploads/drivers/1784003658668-image.jpg' }),
  licensePhotoUrl: z.string().nullable().openapi({ example: '/uploads/drivers/1784003658669-license.jpg' }),
  licenseDetails: z.string().nullable(),
  availability: z.enum(['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE']),
  notes: z.string().nullable(),
  assignedVehicleId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const CreateDriverMultipartSchema = z.object({
  name: z.string().openapi({ example: 'John Doe' }),
  phoneNumber: z.string().openapi({ example: '+254700000000' }),
  whatsappNumber: z.string().openapi({ example: '+254700000000' }),
  licenseDetails: z.string().optional(),
  notes: z.string().optional(),
  availability: z.enum(['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE']).optional(),
  assignedVehicleId: z.string().optional(),
  photo: z.any().openapi({ type: 'string', format: 'binary' }).optional(),
  licensePhoto: z.any().openapi({ type: 'string', format: 'binary' }).optional()
});

const UpdateDriverMultipartSchema = CreateDriverMultipartSchema.partial();

const UpdateDriverAvailabilitySchema = z.object({
  availability: z.enum(['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE'])
});

export const registerDriverSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  // POST /drivers
  registry.registerPath({
    method: 'post',
    path: '/api/v1/drivers',
    tags: ['Drivers'],
    summary: 'Create a new driver (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: CreateDriverMultipartSchema
          }
        }
      }
    },
    responses: {
      201: createSuccessResponse(DriverSchema, 'Driver created successfully', 'Driver created successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  // GET /drivers
  registry.registerPath({
    method: 'get',
    path: '/api/v1/drivers',
    tags: ['Drivers'],
    summary: 'Get all drivers (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        searchTerm: z.string().optional(),
        availability: z.enum(['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE']).optional(),
        assignedVehicleId: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
      })
    },
    responses: {
      200: createPaginatedResponse(DriverSchema, 'Drivers retrieved successfully', 'Drivers retrieved successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  // GET /drivers/:id
  registry.registerPath({
    method: 'get',
    path: '/api/v1/drivers/{id}',
    tags: ['Drivers'],
    summary: 'Get a single driver by ID (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Driver ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(DriverSchema, 'Driver retrieved successfully', 'Driver retrieved successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // PATCH /drivers/:id
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/drivers/{id}',
    tags: ['Drivers'],
    summary: 'Update a driver (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Driver ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'multipart/form-data': {
            schema: UpdateDriverMultipartSchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(DriverSchema, 'Driver updated successfully', 'Driver updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // PATCH /drivers/:id/availability
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/drivers/{id}/availability',
    tags: ['Drivers'],
    summary: 'Update driver availability (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Driver ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': {
            schema: UpdateDriverAvailabilitySchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(DriverSchema, 'Driver availability updated successfully', 'Driver availability updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // DELETE /drivers/:id
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/drivers/{id}',
    tags: ['Drivers'],
    summary: 'Soft delete one or more drivers (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Driver ID (can be anything if sending array in body)', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': {
            schema: z.array(z.string()).optional().openapi({ description: 'Array of Driver IDs for bulk delete', example: ['uuid-1234', 'uuid-5678'] })
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Driver deleted successfully', 'Driver deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
