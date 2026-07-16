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

const VehicleImageSchema = z.object({
  id: z.string().openapi({ example: 'img-1234' }),
  path: z.string().openapi({ example: '/uploads/vehicles/1784003658668-image.jpg' }),
  order: z.number().openapi({ example: 0 })
});

const LocationBasicSchema = z.object({
  id: z.string().openapi({ example: 'loc-1234' }),
  name: z.string().openapi({ example: 'Nairobi Office' }),
  city: z.string().openapi({ example: 'Nairobi' })
});

const VehicleSchema = z.object({
  id: z.string().openapi({ example: 'veh-1234' }),
  name: z.string().openapi({ example: 'Toyota Camry' }),
  category: z.enum(['SALOON', 'SUV', 'VAN', 'LUXURY', 'FOUR_WD', 'CHAUFFEUR_DRIVEN', 'SELF_DRIVEN']),
  brand: z.string().openapi({ example: 'Toyota' }),
  year: z.number().openapi({ example: 2022 }),
  transmission: z.enum(['AUTOMATIC', 'MANUAL']),
  fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']),
  seatingCapacity: z.number().openapi({ example: 5 }),
  luggageCapacity: z.number().nullable().openapi({ example: 3 }),
  description: z.string().nullable(),
  features: z.array(z.string()).openapi({ example: ['AC', 'Bluetooth'] }),
  dailyRate: z.number().openapi({ example: 4500 }),
  weeklyRate: z.number().nullable(),
  monthlyRate: z.number().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  availability: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE']),
  isFeatured: z.boolean().openapi({ example: false }),
  locationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  images: z.array(VehicleImageSchema).optional(),
  location: LocationBasicSchema.optional()
});

const CreateVehicleMultipartSchema = z.object({
  name: z.string().openapi({ example: 'Toyota Camry' }),
  category: z.enum(['SALOON', 'SUV', 'VAN', 'LUXURY', 'FOUR_WD', 'CHAUFFEUR_DRIVEN', 'SELF_DRIVEN']),
  brand: z.string().openapi({ example: 'Toyota' }),
  year: z.number().openapi({ example: 2022 }),
  transmission: z.enum(['AUTOMATIC', 'MANUAL']),
  fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']),
  seatingCapacity: z.number().openapi({ example: 5 }),
  luggageCapacity: z.number().optional().openapi({ example: 3 }),
  description: z.string().optional(),
  features: z.array(z.string()).optional().openapi({ example: ['AC', 'Bluetooth'] }),
  dailyRate: z.number().openapi({ example: 4500 }),
  weeklyRate: z.number().optional(),
  monthlyRate: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  availability: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE']).optional(),
  isFeatured: z.boolean().optional(),
  locationId: z.string().openapi({ example: 'loc-uuid-123' }),
  images: z.any().openapi({ type: 'array', items: { type: 'string', format: 'binary' } }).optional()
});

const UpdateVehicleMultipartSchema = CreateVehicleMultipartSchema.partial();

const UpdateAvailabilitySchema = z.object({
  availability: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE'])
});

export const registerVehicleSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  // POST /vehicles
  registry.registerPath({
    method: 'post',
    path: '/api/v1/vehicles',
    tags: ['Vehicles'],
    summary: 'Create a new vehicle (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: CreateVehicleMultipartSchema
          }
        }
      }
    },
    responses: {
      201: createSuccessResponse(VehicleSchema, 'Vehicle created successfully', 'Vehicle created successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  // GET /vehicles
  registry.registerPath({
    method: 'get',
    path: '/api/v1/vehicles',
    tags: ['Vehicles'],
    summary: 'Get all vehicles (USER + ADMIN)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        searchTerm: z.string().optional(),
        category: z.enum(['SALOON', 'SUV', 'VAN', 'LUXURY', 'FOUR_WD', 'CHAUFFEUR_DRIVEN', 'SELF_DRIVEN']).optional(),
        transmission: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
        fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional(),
        locationId: z.string().optional(),
        availability: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE']).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        isFeatured: z.string().optional(),
        minPrice: z.string().optional(),
        maxPrice: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
      })
    },
    responses: {
      200: createPaginatedResponse(VehicleSchema, 'Vehicles retrieved successfully', 'Vehicles retrieved successfully.'),
      401: Error401,
      500: Error500
    }
  });

  // GET /vehicles/:id
  registry.registerPath({
    method: 'get',
    path: '/api/v1/vehicles/{id}',
    tags: ['Vehicles'],
    summary: 'Get a single vehicle by ID (USER + ADMIN)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Vehicle ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(VehicleSchema, 'Vehicle retrieved successfully', 'Vehicle retrieved successfully.'),
      401: Error401,
      404: Error404,
      500: Error500
    }
  });

  // PATCH /vehicles/:id
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/vehicles/{id}',
    tags: ['Vehicles'],
    summary: 'Update a vehicle (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Vehicle ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'multipart/form-data': {
            schema: UpdateVehicleMultipartSchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(VehicleSchema, 'Vehicle updated successfully', 'Vehicle updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // PATCH /vehicles/:id/availability
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/vehicles/{id}/availability',
    tags: ['Vehicles'],
    summary: 'Update vehicle availability (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Vehicle ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': {
            schema: UpdateAvailabilitySchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(VehicleSchema, 'Vehicle availability updated successfully', 'Vehicle availability updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // DELETE /vehicles/:id
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/vehicles/{id}',
    tags: ['Vehicles'],
    summary: 'Hard delete a vehicle (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Vehicle ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Vehicle deleted successfully', 'Vehicle deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
