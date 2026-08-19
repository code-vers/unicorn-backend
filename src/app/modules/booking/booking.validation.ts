import { z } from 'zod';

const uuid = z.string().uuid();
const dateTime = z.string().refine((value) => Number.isFinite(Date.parse(value)), {
  message: 'Invalid date or time.'
});

const bookingOptions = {
  hasGps: z.boolean().optional(),
  hasFullInsurance: z.boolean().optional(),
  hasAdditionalDriver: z.boolean().optional(),
  hasChildSeat: z.boolean().optional()
};

const calculateBookingZodSchema = z.object({
  body: z
    .object({
      vehicleId: uuid,
      pickupLocationId: uuid,
      dropOffLocationId: uuid,
      pickupDate: dateTime,
      dropOffDate: dateTime,
      ...bookingOptions
    })
    .strict()
});

const driverDetailSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(1, 'Phone is required'),
    dateOfBirth: dateTime.optional(),
    message: z.string().trim().max(2000).optional()
  })
  .strict();

const billingInfoSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(1, 'Phone is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    country: z.string().min(1, 'Country is required'),
    zipCode: z.string().optional(),
    description: z.string().trim().max(2000).optional()
  })
  .strict();

const createBookingZodSchema = z.object({
  body: z
    .object({
      vehicleId: uuid,
      pickupLocationId: uuid,
      dropOffLocationId: uuid,
      pickupDate: dateTime,
      dropOffDate: dateTime,
      ...bookingOptions,
      driverDetails: driverDetailSchema,
      billingInfo: billingInfoSchema
    })
    .strict()
});

const modifyBookingZodSchema = z.object({
  body: z.object({ dropOffDate: dateTime.optional(), ...bookingOptions }).strict()
});

const paymentZodSchema = z.object({
  body: z
    .object({
      paymentMethod: z.enum(['MPESA', 'AIRTEL', 'CARD', 'PESAPAL']),
      amount: z.number().finite().positive('Amount must be greater than 0')
    })
    .strict()
});

const statusZodSchema = z.object({
  body: z
    .object({
      status: z.enum(['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
      assignedDriverId: uuid.optional()
    })
    .strict()
});

const bookingIdParamsZodSchema = z.object({
  params: z.object({ id: uuid }).strict()
});

export const BookingValidation = {
  calculateBookingZodSchema,
  createBookingZodSchema,
  modifyBookingZodSchema,
  paymentZodSchema,
  statusZodSchema,
  bookingIdParamsZodSchema
};
