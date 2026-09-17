import { z } from 'zod';

const savePricing = z.object({
  body: z
    .object({
      vehicleId: z.string().uuid().nullable().optional(),
      dailyRate: z.number({ error: 'Daily rate is required' }).nonnegative(),
      weeklyRate: z.number({ error: 'Weekly rate is required' }).nonnegative(),
      monthlyRate: z.number({ error: 'Monthly rate is required' }).nonnegative(),
      chauffeurRate: z.number({ error: 'Chauffeur rate is required' }).nonnegative(),
      securityDeposit: z.number({ error: 'Security deposit is required' }).nonnegative(),
      deliveryCollectionCharge: z
        .number({ error: 'Delivery collection charge is required' })
        .nonnegative(),
      airportPickupDropCharge: z
        .number({ error: 'Airport pickup drop charge is required' })
        .nonnegative(),
      gpsCharge: z.number({ error: 'GPS charge is required' }).nonnegative(),
      fullInsuranceCharge: z.number({ error: 'Insurance charge is required' }).nonnegative(),
      additionalDriverCharge: z
        .number({ error: 'Additional-driver charge is required' })
        .nonnegative(),
      childSeatCharge: z.number({ error: 'Child-seat charge is required' }).nonnegative(),
      discountPercentage: z.number().min(0).max(100).optional(),
      discountValidFrom: z.string().datetime().nullable().optional(),
      discountValidUntil: z.string().datetime().nullable().optional()
    })
    .strict()
});

export const PricingValidation = {
  savePricing
};
