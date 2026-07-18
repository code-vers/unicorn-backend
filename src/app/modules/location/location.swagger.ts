import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  Error400,
  Error401,
  Error403,
  Error404,
  Error409,
  Error500,
  createPaginatedResponse,
  createSuccessResponse
} from '../../utils/swaggerHelpers';

const LocationSchema = z.object({
  id: z.string().openapi({ example: 'uuid-1234' }),
  name: z.string().openapi({ example: 'Nairobi Office' }),
  address: z.string().openapi({ example: 'A6 Mutirithi Road' }),
  city: z.string().openapi({ example: 'Nairobi' }),
  locationType: z
    .enum(['OFFICE', 'AIRPORT', 'HOTEL', 'PORT', 'SHOWROOM', 'OTHER'])
    .openapi({ example: 'OFFICE' }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).openapi({ example: 'ACTIVE' }),
  createdAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  updatedAt: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' })
});

const CreateLocationBodySchema = z.object({
  name: z.string().openapi({ example: 'Nairobi Office' }),
  address: z.string().openapi({ example: 'A6 Mutirithi Road' }),
  city: z.string().openapi({ example: 'Nairobi' }),
  locationType: z
    .enum(['OFFICE', 'AIRPORT', 'HOTEL', 'PORT', 'SHOWROOM', 'OTHER'])
    .openapi({ example: 'AIRPORT' }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional().openapi({ example: 'ACTIVE' })
});

const UpdateLocationBodySchema = CreateLocationBodySchema.partial();

export const registerLocationSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  // POST /locations
  registry.registerPath({
    method: 'post',
    path: '/api/v1/locations',
    tags: ['Locations'],
    summary: 'Create a new location (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateLocationBodySchema
          }
        }
      }
    },
    responses: {
      201: createSuccessResponse(LocationSchema, 'Location created successfully', 'Location created successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      409: Error409,
      500: Error500
    }
  });

  // GET /locations
  registry.registerPath({
    method: 'get',
    path: '/api/v1/locations',
    tags: ['Locations'],
    summary: 'Get all locations (USER + ADMIN)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        searchTerm: z.string().optional().openapi({ description: 'Search by name, address, or city' }),
        city: z.string().optional().openapi({ example: 'Nairobi' }),
        locationType: z
          .enum(['OFFICE', 'AIRPORT', 'HOTEL', 'PORT', 'SHOWROOM', 'OTHER'])
          .optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
        page: z.string().optional().openapi({ example: '1' }),
        limit: z.string().optional().openapi({ example: '10' }),
        sortBy: z.string().optional().openapi({ example: 'name' }),
        sortOrder: z.enum(['asc', 'desc']).optional()
      })
    },
    responses: {
      200: createPaginatedResponse(LocationSchema, 'Locations retrieved successfully', 'Locations retrieved successfully.'),
      401: Error401,
      500: Error500
    }
  });

  // GET /locations/:id
  registry.registerPath({
    method: 'get',
    path: '/api/v1/locations/{id}',
    tags: ['Locations'],
    summary: 'Get a single location by ID (USER + ADMIN)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Location ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(LocationSchema, 'Location retrieved successfully', 'Location retrieved successfully.'),
      401: Error401,
      404: Error404,
      500: Error500
    }
  });

  // PATCH /locations/:id
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/locations/{id}',
    tags: ['Locations'],
    summary: 'Update a location (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Location ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': {
            schema: UpdateLocationBodySchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(LocationSchema, 'Location updated successfully', 'Location updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      409: Error409,
      500: Error500
    }
  });

  // DELETE /locations/:id
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/locations/{id}',
    tags: ['Locations'],
    summary: 'Soft delete one or more locations (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Location ID (can be anything if sending array in body)', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': {
            schema: z.array(z.string()).optional().openapi({ description: 'Array of Location IDs for bulk delete', example: ['uuid-1234', 'uuid-5678'] })
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Location(s) deleted successfully', 'Location(s) deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
