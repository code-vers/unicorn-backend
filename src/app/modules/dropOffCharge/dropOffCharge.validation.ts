import { z } from 'zod';

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

const create = z.object({
  body: z.object({
    pickupLocationId: z.string().uuid('Invalid pickup location ID.'),
    dropOffLocationId: z.string().uuid('Invalid drop-off location ID.'),
    vehicleCategory: z.enum(VEHICLE_CATEGORIES).optional(),
    vehicleId: z.string().uuid('Invalid vehicle ID format.').optional(),
    chargeType: z.enum(CHARGE_TYPES).optional(),
    amount: z.number(),
    seasonalMultiplier: z.number().optional(),
    status: z.enum(STATUSES).optional()
  }).refine((data) => data.pickupLocationId !== data.dropOffLocationId, {
    message: 'Pickup and drop-off locations cannot be the same.',
    path: ['dropOffLocationId']
  })
});

const update = z.object({
  body: z.object({
    pickupLocationId: z.string().uuid('Invalid pickup location ID.').optional(),
    dropOffLocationId: z.string().uuid('Invalid drop-off location ID.').optional(),
    vehicleCategory: z.enum(VEHICLE_CATEGORIES).optional(),
    vehicleId: z.string().uuid('Invalid vehicle ID format.').optional(),
    chargeType: z.enum(CHARGE_TYPES).optional(),
    amount: z.number().optional(),
    seasonalMultiplier: z.number().optional(),
    status: z.enum(STATUSES).optional()
  }).refine((data) => {
    if (data.pickupLocationId && data.dropOffLocationId) {
      return data.pickupLocationId !== data.dropOffLocationId;
    }
    return true; // Wait, if only one is provided, we can't fully validate against the other here without DB query.
  }, {
    message: 'Pickup and drop-off locations cannot be the same.',
    path: ['dropOffLocationId']
  })
});

export const DropOffChargeValidation = {
  create,
  update
};
