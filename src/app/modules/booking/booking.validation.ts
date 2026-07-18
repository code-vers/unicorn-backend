import { z } from 'zod';

const calculateBookingZodSchema = z.object({
  body: z.object({
    vehicleId: z.string().min(1, 'vehicleId is required'),
    pickupLocationId: z.string().min(1, 'pickupLocationId is required'),
    dropOffLocationId: z.string().min(1, 'dropOffLocationId is required'),
    pickupDate: z.string().min(1, 'pickupDate is required'),
    dropOffDate: z.string().min(1, 'dropOffDate is required'),
    hasGps: z.boolean().optional(),
    hasFullInsurance: z.boolean().optional(),
    hasAdditionalDriver: z.boolean().optional(),
    hasChildSeat: z.boolean().optional()
  })
});

const driverDetailSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  dateOfBirth: z.string().optional(),
  message: z.string().optional()
});

const billingInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  zipCode: z.string().optional(),
  description: z.string().optional()
});

const createBookingZodSchema = z.object({
  body: z.object({
    vehicleId: z.string().min(1, 'vehicleId is required'),
    pickupLocationId: z.string().min(1, 'pickupLocationId is required'),
    dropOffLocationId: z.string().min(1, 'dropOffLocationId is required'),
    pickupDate: z.string().min(1, 'pickupDate is required'),
    dropOffDate: z.string().min(1, 'dropOffDate is required'),
    hasGps: z.boolean().optional(),
    hasFullInsurance: z.boolean().optional(),
    hasAdditionalDriver: z.boolean().optional(),
    hasChildSeat: z.boolean().optional(),
    driverDetails: driverDetailSchema,
    billingInfo: billingInfoSchema
  })
});

const modifyBookingZodSchema = z.object({
  body: z.object({
    dropOffDate: z.string().optional(),
    hasGps: z.boolean().optional(),
    hasFullInsurance: z.boolean().optional(),
    hasAdditionalDriver: z.boolean().optional(),
    hasChildSeat: z.boolean().optional()
  })
});

const paymentZodSchema = z.object({
  body: z.object({
    paymentMethod: z.enum(['MPESA', 'AIRTEL', 'CARD', 'PESAPAL']),
    amount: z.number().min(1, 'Amount must be greater than 0')
  })
});

const statusZodSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
    assignedDriverId: z.string().optional()
  })
});

export const BookingValidation = {
  calculateBookingZodSchema,
  createBookingZodSchema,
  modifyBookingZodSchema,
  paymentZodSchema,
  statusZodSchema
};
