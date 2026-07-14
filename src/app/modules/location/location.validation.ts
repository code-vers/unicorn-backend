import { z } from 'zod';

const LOCATION_TYPES = ['OFFICE', 'AIRPORT', 'HOTEL', 'PORT', 'SHOWROOM', 'OTHER'] as const;
const LOCATION_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;

const create = z.object({
  body: z
    .object({
      name: z
        .string({ error: 'Location name is required.' })
        .min(2, 'Name must be at least 2 characters.')
        .max(100, 'Name must not exceed 100 characters.'),
      address: z
        .string({ error: 'Address is required.' })
        .min(5, 'Address must be at least 5 characters.')
        .max(255, 'Address must not exceed 255 characters.'),
      city: z
        .string({ error: 'City is required.' })
        .min(2, 'City must be at least 2 characters.')
        .max(100, 'City must not exceed 100 characters.'),
      locationType: z.enum(LOCATION_TYPES, {
        error: `Location type must be one of: ${LOCATION_TYPES.join(', ')}.`
      }),
      status: z
        .enum(LOCATION_STATUSES, {
          error: `Status must be one of: ${LOCATION_STATUSES.join(', ')}.`
        })
        .optional()
        .default('ACTIVE')
    })
    .strict()
});

const update = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(2, 'Name must be at least 2 characters.')
        .max(100, 'Name must not exceed 100 characters.')
        .optional(),
      address: z
        .string()
        .min(5, 'Address must be at least 5 characters.')
        .max(255, 'Address must not exceed 255 characters.')
        .optional(),
      city: z
        .string()
        .min(2, 'City must be at least 2 characters.')
        .max(100, 'City must not exceed 100 characters.')
        .optional(),
      locationType: z
        .enum(LOCATION_TYPES, {
          error: `Location type must be one of: ${LOCATION_TYPES.join(', ')}.`
        })
        .optional(),
      status: z
        .enum(LOCATION_STATUSES, {
          error: `Status must be one of: ${LOCATION_STATUSES.join(', ')}.`
        })
        .optional()
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to update.'
    })
});

export const LocationValidation = {
  create,
  update
};
