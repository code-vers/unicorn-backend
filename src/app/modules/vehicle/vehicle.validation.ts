import { z } from 'zod';

const VEHICLE_CATEGORIES = ['SALOON', 'SUV', 'VAN', 'LUXURY', 'FOUR_WD', 'CHAUFFEUR_DRIVEN', 'SELF_DRIVEN'] as const;
const VEHICLE_TRANSMISSIONS = ['AUTOMATIC', 'MANUAL'] as const;
const VEHICLE_FUEL_TYPES = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID'] as const;
const VEHICLE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
const VEHICLE_AVAILABILITIES = ['AVAILABLE', 'RENTED', 'MAINTENANCE'] as const;

// Helper to coerce string to number, useful for multipart/form-data
const coerceNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? val : parsed;
  }
  return val;
}, z.number());

const coerceBoolean = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return val;
}, z.boolean());

const coerceArray = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [val]; // If it's a single string, wrap it in array
    }
  }
  return val;
}, z.array(z.string()));

const create = z.object({
  body: z
    .object({
      name: z.string({ error: 'Vehicle name is required.' }),
      category: z.enum(VEHICLE_CATEGORIES, { error: `Category must be one of: ${VEHICLE_CATEGORIES.join(', ')}` }),
      brand: z.string({ error: 'Brand is required.' }),
      year: coerceNumber,
      transmission: z.enum(VEHICLE_TRANSMISSIONS, { error: `Transmission must be one of: ${VEHICLE_TRANSMISSIONS.join(', ')}` }),
      fuelType: z.enum(VEHICLE_FUEL_TYPES, { error: `Fuel type must be one of: ${VEHICLE_FUEL_TYPES.join(', ')}` }),
      seatingCapacity: coerceNumber,
      luggageCapacity: coerceNumber.optional(),
      description: z.string().optional(),
      features: coerceArray.optional(),
      dailyRate: coerceNumber,
      weeklyRate: coerceNumber.optional(),
      monthlyRate: coerceNumber.optional(),
      status: z.enum(VEHICLE_STATUSES).optional(),
      availability: z.enum(VEHICLE_AVAILABILITIES).optional(),
      isFeatured: coerceBoolean.optional(),
      locationId: z.string({ error: 'Location ID is required.' }).uuid('Invalid location ID format.')
    })
    // In multipart/form-data, empty strings might be sent, strict might reject unexpected fields.
    // It's safer to not use .strict() for multipart/form-data, or we strip unknowns.
    // We will use .strip() behavior (default Zod object behavior).
});

const update = z.object({
  body: z.preprocess((val) => {
    if (typeof val === 'object' && val !== null) {
      const sanitized = { ...(val as Record<string, unknown>) };
      Object.keys(sanitized).forEach((key) => {
        if (sanitized[key] === '') {
          delete sanitized[key];
        }
      });
      return sanitized;
    }
    return val;
  }, z.object({
      name: z.string().optional(),
      category: z.enum(VEHICLE_CATEGORIES).optional(),
      brand: z.string().optional(),
      year: coerceNumber.optional(),
      transmission: z.enum(VEHICLE_TRANSMISSIONS).optional(),
      fuelType: z.enum(VEHICLE_FUEL_TYPES).optional(),
      seatingCapacity: coerceNumber.optional(),
      luggageCapacity: coerceNumber.optional(),
      description: z.string().optional(),
      features: coerceArray.optional(),
      dailyRate: coerceNumber.optional(),
      weeklyRate: coerceNumber.optional(),
      monthlyRate: coerceNumber.optional(),
      status: z.enum(VEHICLE_STATUSES).optional(),
      availability: z.enum(VEHICLE_AVAILABILITIES).optional(),
      isFeatured: coerceBoolean.optional(),
      locationId: z.string().uuid('Invalid location ID format.').optional()
    }))
});

const updateAvailability = z.object({
  body: z.object({
    availability: z.enum(VEHICLE_AVAILABILITIES, { error: 'Availability status is required.' })
  }).strict()
});

export const VehicleValidation = {
  create,
  update,
  updateAvailability
};
