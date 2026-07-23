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

const FeatureSchema = z.object({
  id: z.string().openapi({ example: 'uuid-1234' }),
  name: z.string().openapi({ example: 'Air Conditioning' }),
  description: z.string().nullable().openapi({ example: 'Cool air' }),
  iconUrl: z.string().nullable().openapi({ example: 'https://example.com/ac.png' }),
  charge: z.number().openapi({ example: 0 }),
  isAddon: z.boolean().openapi({ example: false }),
  createdAt: z.string().openapi({ example: '2023-10-25T10:00:00Z' }),
  updatedAt: z.string().openapi({ example: '2023-10-25T10:00:00Z' })
});

const FeatureCreateSchema = z.object({
  name: z.string().openapi({ example: 'GPS' }),
  description: z.string().optional().openapi({ example: 'Navigation system' }),
  iconUrl: z.string().optional().openapi({ example: 'https://example.com/gps.png' }),
  charge: z.number().optional().openapi({ example: 10 }),
  isAddon: z.boolean().optional().openapi({ example: true })
});

export const registerFeatureSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  // POST /features
  registry.registerPath({
    method: 'post',
    path: '/api/v1/features',
    tags: ['Features'],
    summary: 'Create a new feature or addon',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': { schema: FeatureCreateSchema }
        }
      }
    },
    responses: {
      201: createSuccessResponse(FeatureSchema, 'Feature created successfully', 'Feature created successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  // GET /features
  registry.registerPath({
    method: 'get',
    path: '/api/v1/features',
    tags: ['Features'],
    summary: 'Get all features',
    request: {
      query: z.object({
        searchTerm: z.string().optional(),
        isAddon: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional()
      })
    },
    responses: {
      200: createPaginatedResponse(FeatureSchema, 'Features retrieved successfully', 'Features retrieved successfully.'),
      500: Error500
    }
  });

  // GET /features/:id
  registry.registerPath({
    method: 'get',
    path: '/api/v1/features/{id}',
    tags: ['Features'],
    summary: 'Get a feature by ID',
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Feature ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(FeatureSchema, 'Feature retrieved successfully', 'Feature retrieved successfully.'),
      404: Error404,
      500: Error500
    }
  });

  // PATCH /features/:id
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/features/{id}',
    tags: ['Features'],
    summary: 'Update a feature',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Feature ID', example: 'uuid-1234' })
      }),
      body: {
        content: {
          'application/json': { schema: FeatureCreateSchema.partial() }
        }
      }
    },
    responses: {
      200: createSuccessResponse(FeatureSchema, 'Feature updated successfully', 'Feature updated successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // DELETE /features/:id
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/features/{id}',
    tags: ['Features'],
    summary: 'Delete a feature',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Feature ID', example: 'uuid-1234' })
      })
    },
    responses: {
      200: createSuccessResponse(FeatureSchema, 'Feature deleted successfully', 'Feature deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
