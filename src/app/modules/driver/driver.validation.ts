import { z } from 'zod';

const DRIVER_AVAILABILITIES = ['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE'] as const;

const create = z.object({
  body: z.object({
    name: z.string({ error: 'Driver name is required.' }),
    phoneNumber: z.string({ error: 'Phone number is required.' }),
    whatsappNumber: z.string({ error: 'WhatsApp number is required.' }),
    licenseDetails: z.string().optional(),
    notes: z.string().optional(),
    availability: z.enum(DRIVER_AVAILABILITIES).optional(),
    assignedVehicleId: z.string().uuid('Invalid vehicle ID format.').optional()
  })
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
    phoneNumber: z.string().optional(),
    whatsappNumber: z.string().optional(),
    licenseDetails: z.string().optional(),
    notes: z.string().optional(),
    availability: z.enum(DRIVER_AVAILABILITIES).optional(),
    assignedVehicleId: z.string().uuid('Invalid vehicle ID format.').optional()
  }))
});

const updateAvailability = z.object({
  body: z.object({
    availability: z.enum(DRIVER_AVAILABILITIES, { error: 'Availability status is required.' })
  }).strict()
});

export const DriverValidation = {
  create,
  update,
  updateAvailability
};
