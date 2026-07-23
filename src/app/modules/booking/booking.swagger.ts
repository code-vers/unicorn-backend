import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  Error400,
  Error401,
  Error403,
  Error404,
  Error500,
  createPaginatedResponse,
  createSuccessResponse
} from '../../utils/swaggerHelpers';

const BookingSchema = z.object({
  id: z.string(),
  referenceId: z.string(),
  userId: z.string(),
  vehicleId: z.string(),
  pickupLocationId: z.string(),
  dropOffLocationId: z.string(),
  pickupDate: z.string(),
  dropOffDate: z.string(),
  rentalCost: z.number(),
  pickupFee: z.number(),
  dropOffFee: z.number(),
  hasGps: z.boolean(),
  hasFullInsurance: z.boolean(),
  hasAdditionalDriver: z.boolean(),
  hasChildSeat: z.boolean(),
  addonsCost: z.number(),
  taxPercentage: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  amountPaid: z.number(),
  paymentStatus: z.string(),
  bookingStatus: z.string(),
  assignedDriverId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const CalculateBookingSchema = z.object({
  vehicleId: z.string(),
  pickupLocationId: z.string(),
  dropOffLocationId: z.string(),
  pickupDate: z.string(),
  dropOffDate: z.string(),
  hasGps: z.boolean().optional(),
  hasFullInsurance: z.boolean().optional(),
  hasAdditionalDriver: z.boolean().optional(),
  hasChildSeat: z.boolean().optional()
});

const CreateBookingSchema = CalculateBookingSchema.extend({
  driverDetails: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    dateOfBirth: z.string().optional(),
    message: z.string().optional()
  }),
  billingInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    zipCode: z.string().optional(),
    description: z.string().optional()
  })
});

export const registerBookingSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  registry.registerPath({
    method: 'post',
    path: '/api/v1/bookings/calculate',
    tags: ['Bookings'],
    summary: 'Calculate booking costs',
    request: {
      body: {
        content: {
          'application/json': {
            schema: CalculateBookingSchema
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(z.any(), 'Calculation successful', 'Calculation successful.'),
      400: Error400,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/bookings',
    tags: ['Bookings'],
    summary: 'Create a new booking',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateBookingSchema
          }
        }
      }
    },
    responses: {
      201: createSuccessResponse(BookingSchema, 'Booking created successfully', 'Booking created successfully.'),
      400: Error400,
      401: Error401,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/bookings',
    tags: ['Bookings'],
    summary: 'Get all bookings (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        page: z.string().optional(),
        limit: z.string().optional()
      })
    },
    responses: {
      200: createPaginatedResponse(BookingSchema, 'Bookings retrieved successfully', 'Bookings retrieved successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/bookings/my-bookings',
    tags: ['Bookings'],
    summary: 'Get my bookings',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: createPaginatedResponse(BookingSchema, 'Bookings retrieved successfully', 'Bookings retrieved successfully.'),
      401: Error401,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/bookings/{id}',
    tags: ['Bookings'],
    summary: 'Get booking by ID',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string()
      })
    },
    responses: {
      200: createSuccessResponse(BookingSchema, 'Booking retrieved successfully', 'Booking retrieved successfully.'),
      401: Error401,
      404: Error404,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/bookings/{id}/status',
    tags: ['Bookings'],
    summary: 'Update booking status (ADMIN only)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              status: z.enum(['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
              assignedDriverId: z.string().optional()
            })
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(BookingSchema, 'Booking status updated successfully', 'Booking status updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
