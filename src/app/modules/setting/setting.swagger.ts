import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  Error401,
  Error403,
  Error404,
  Error500,
  createSuccessResponse
} from '../../utils/swaggerHelpers';

const SettingSchema = z.object({
  id: z.string().openapi({ example: 'set-1234' }),
  key: z.string().openapi({ example: 'TAX_PERCENTAGE' }),
  value: z.string().openapi({ example: '16.00' }),
  description: z.string().nullable().openapi({ example: 'VAT Tax percentage' }),
  updatedAt: z.string()
});

const CreateSettingSchema = z.object({
  key: z.string().openapi({ example: 'TAX_PERCENTAGE' }),
  value: z.string().openapi({ example: '16.00' }),
  description: z.string().optional().openapi({ example: 'VAT Tax percentage' })
});

export const registerSettingSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  registry.registerPath({
    method: 'get',
    path: '/api/v1/settings',
    tags: ['System Settings'],
    summary: 'Get all system settings (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: createSuccessResponse(z.array(SettingSchema), 'Settings retrieved successfully', 'Settings retrieved successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/settings',
    tags: ['System Settings'],
    summary: 'Create or update a system setting (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateSettingSchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(SettingSchema, 'Setting updated successfully', 'Setting updated successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/settings/{key}',
    tags: ['System Settings'],
    summary: 'Get a single setting by key',
    request: {
      params: z.object({
        key: z.string().openapi({ example: 'TAX_PERCENTAGE' })
      })
    },
    responses: {
      200: createSuccessResponse(SettingSchema, 'Setting retrieved successfully', 'Setting retrieved successfully.'),
      404: Error404,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/v1/settings/{key}',
    tags: ['System Settings'],
    summary: 'Delete a system setting by key (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        key: z.string().openapi({ example: 'TAX_PERCENTAGE' })
      })
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Setting deleted successfully', 'Setting deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
