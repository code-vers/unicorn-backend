import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const PricingSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid().nullable(),
  dailyRate: z.number(),
  weeklyRate: z.number(),
  monthlyRate: z.number(),
  selfDriveRate: z.number(),
  chauffeurRate: z.number(),
  seasonalMultiplier: z.number(),
  extraDayCharge: z.number(),
  lateReturnHourlyCharge: z.number(),
  securityDeposit: z.number(),
  deliveryCollectionCharge: z.number(),
  airportPickupDropCharge: z.number(),
  extraMileageCharge: z.number(),
  gpsCharge: z.number(),
  fullInsuranceCharge: z.number(),
  additionalDriverCharge: z.number(),
  childSeatCharge: z.number(),
  discountPercentage: z.number(),
  discountValidUntil: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).openapi('Pricing');

export const registerPricingSwagger = (registry: OpenAPIRegistry, bearerAuth: any) => {
  registry.registerPath({
  method: 'put',
  path: '/api/v1/pricing',
  tags: ['Pricing'],
  summary: 'Save pricing configuration',
  description: 'Create or update pricing for a specific vehicle or globally (if vehicleId is omitted).',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            vehicleId: z.string().uuid().nullable().optional(),
            dailyRate: z.number(),
            weeklyRate: z.number(),
            monthlyRate: z.number(),
            selfDriveRate: z.number(),
            chauffeurRate: z.number(),
            seasonalMultiplier: z.number().optional(),
            extraDayCharge: z.number(),
            lateReturnHourlyCharge: z.number(),
            securityDeposit: z.number(),
            deliveryCollectionCharge: z.number(),
            airportPickupDropCharge: z.number(),
            extraMileageCharge: z.number(),
            gpsCharge: z.number().optional(),
            fullInsuranceCharge: z.number().optional(),
            additionalDriverCharge: z.number().optional(),
            childSeatCharge: z.number().optional(),
            discountPercentage: z.number().optional(),
            discountValidUntil: z.string().datetime().optional()
          }).openapi('SavePricingPayload')
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Pricing saved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: PricingSchema
          })
        }
      }
    }
  }
});

  registry.registerPath({
  method: 'get',
  path: '/api/v1/pricing',
  tags: ['Pricing'],
  summary: 'Get pricing configuration',
  description: 'Get pricing for a specific vehicle. Falls back to global pricing if specific is not found.',
  request: {
    query: z.object({
      vehicleId: z.string().uuid().optional().openapi({ description: 'Specific vehicle ID' })
    })
  },
  responses: {
    200: {
      description: 'Pricing retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: PricingSchema.nullable()
          })
        }
      }
    }
  }
});

  registry.registerPath({
  method: 'delete',
  path: '/api/v1/pricing/{vehicleId}',
  tags: ['Pricing'],
  summary: 'Delete specific vehicle pricing',
  description: 'Delete pricing for a specific vehicle. Will fallback to global pricing afterwards.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      vehicleId: z.string().uuid()
    })
  },
  responses: {
    200: {
      description: 'Pricing deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.null()
          })
        }
      }
    }
  }
});
};
