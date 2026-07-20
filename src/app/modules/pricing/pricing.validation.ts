import { z } from 'zod';

const savePricing = z.object({
  body: z.object({
    vehicleId: z.string().uuid().nullable().optional(),
    dailyRate: z.number({ error: 'Daily rate is required' }),
    weeklyRate: z.number({ error: 'Weekly rate is required' }),
    monthlyRate: z.number({ error: 'Monthly rate is required' }),
    selfDriveRate: z.number({ error: 'Self drive rate is required' }),
    chauffeurRate: z.number({ error: 'Chauffeur rate is required' }),
    seasonalMultiplier: z.number().optional(),
    extraDayCharge: z.number({ error: 'Extra day charge is required' }),
    lateReturnHourlyCharge: z.number({ error: 'Late return hourly charge is required' }),
    securityDeposit: z.number({ error: 'Security deposit is required' }),
    deliveryCollectionCharge: z.number({ error: 'Delivery collection charge is required' }),
    airportPickupDropCharge: z.number({ error: 'Airport pickup drop charge is required' }),
    extraMileageCharge: z.number({ error: 'Extra mileage charge is required' }),
    gpsCharge: z.number().optional(),
    fullInsuranceCharge: z.number().optional(),
    additionalDriverCharge: z.number().optional(),
    childSeatCharge: z.number().optional(),
    discountPercentage: z.number().optional(),
    discountValidUntil: z.string().datetime().optional()
  })
});

export const PricingValidation = {
  savePricing
};
