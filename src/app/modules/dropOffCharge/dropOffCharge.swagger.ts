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

const VEHICLE_CATEGORIES = [
  'SALOON',
  'SUV',
  'VAN',
  'LUXURY',
  'FOUR_WD',
  'CHAUFFEUR_DRIVEN',
  'SELF_DRIVEN'
] as const;

const CHARGE_TYPES = ['FIXED', 'PER_KM'] as const;
const STATUSES = ['ACTIVE', 'INACTIVE'] as const;

const DropOffChargeSchema = z.object({
  id: z.string().openapi({ example: 'doc-1234' }),
  pickupLocationId: z.string().openapi({ example: 'loc-pickup' }),
  dropOffLocationId: z.string().openapi({ example: 'loc-dropoff' }),
  vehicleCategory: z.enum(VEHICLE_CATEGORIES).nullable().openapi({ example: 'SUV' }),
  vehicleId: z.string().nullable().openapi({ example: 'veh-1234' }),
  chargeType: z.enum(CHARGE_TYPES).openapi({ example: 'FIXED' }),
  amount: z.number().openapi({ example: 5000 }),
  seasonalMultiplier: z.number().nullable().openapi({ example: 1.5 }),
  status: z.enum(STATUSES).openapi({ example: 'ACTIVE' }),
  createdAt: z.string(),
  updatedAt: z.string()
});

const CreateDropOffChargeSchema = z.object({
  pickupLocationId: z.string().openapi({ example: 'uuid-pickup' }),
  dropOffLocationId: z.string().openapi({ example: 'uuid-dropoff' }),
  vehicleCategory: z.enum(VEHICLE_CATEGORIES).optional().openapi({ example: 'SUV' }),
  vehicleId: z.string().optional().openapi({ example: 'uuid-vehicle' }),
  chargeType: z.enum(CHARGE_TYPES).optional().openapi({ example: 'FIXED' }),
  amount: z.number().openapi({ example: 5000 }),
  seasonalMultiplier: z.number().optional().openapi({ example: 1000 }),
  status: z.enum(STATUSES).optional().openapi({ example: 'ACTIVE' })
});

const UpdateDropOffChargeSchema = CreateDropOffChargeSchema.partial();

export const registerDropOffChargeSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  // POST /drop-off-charges
  registry.registerPath({
    method: 'post',
    path: '/api/v1/drop-off-charges',
    tags: ['Drop-Off Charges'],
    summary: 'Create a new drop-off charge (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateDropOffChargeSchema
          }
        }
      }
    },
    responses: {
      201: createSuccessResponse(DropOffChargeSchema, 'Drop-off charge created successfully', 'Drop-off charge created successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      409: Error409,
      500: Error500
    }
  });

  // GET /drop-off-charges
  registry.registerPath({
    method: 'get',
    path: '/api/v1/drop-off-charges',
    tags: ['Drop-Off Charges'],
    summary: 'Get all drop-off charges (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        pickupLocationId: z.string().optional(),
        dropOffLocationId: z.string().optional(),
        vehicleCategory: z.enum(VEHICLE_CATEGORIES).optional(),
        vehicleId: z.string().optional(),
        chargeType: z.enum(CHARGE_TYPES).optional(),
        status: z.enum(STATUSES).optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
      })
    },
    responses: {
      200: createPaginatedResponse(DropOffChargeSchema, 'Drop-off charges retrieved successfully', 'Drop-off charges retrieved successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  // GET /drop-off-charges/:id
  registry.registerPath({
    method: 'get',
    path: '/api/v1/drop-off-charges/{id}',
    tags: ['Drop-Off Charges'],
    summary: 'Get a single drop-off charge by ID (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Drop-off charge ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(DropOffChargeSchema, 'Drop-off charge retrieved successfully', 'Drop-off charge retrieved successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // PATCH /drop-off-charges/:id
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/drop-off-charges/{id}',
    tags: ['Drop-Off Charges'],
    summary: 'Update a drop-off charge (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Drop-off charge ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': {
            schema: UpdateDropOffChargeSchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(DropOffChargeSchema, 'Drop-off charge updated successfully', 'Drop-off charge updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      409: Error409,
      500: Error500
    }
  });

  // DELETE /drop-off-charges/:id
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/drop-off-charges/{id}',
    tags: ['Drop-Off Charges'],
    summary: 'Soft delete a drop-off charge (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Drop-off charge ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Drop-off charge deleted successfully', 'Drop-off charge deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
