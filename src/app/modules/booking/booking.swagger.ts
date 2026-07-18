export const bookingSwaggerPaths = {
  '/api/v1/bookings/calculate': {
    post: {
      tags: ['Bookings'],
      summary: 'Calculate booking costs',
      description: 'Get the estimated cost for a booking including rental, drop-off fee, addons, and taxes',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                vehicleId: { type: 'string' },
                pickupLocationId: { type: 'string' },
                dropOffLocationId: { type: 'string' },
                pickupDate: { type: 'string', format: 'date-time' },
                dropOffDate: { type: 'string', format: 'date-time' },
                hasGps: { type: 'boolean' },
                hasFullInsurance: { type: 'boolean' },
                hasAdditionalDriver: { type: 'boolean' },
                hasChildSeat: { type: 'boolean' }
              },
              required: ['vehicleId', 'pickupLocationId', 'dropOffLocationId', 'pickupDate', 'dropOffDate']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Calculation successful'
        }
      }
    }
  },
  '/api/v1/bookings': {
    post: {
      tags: ['Bookings'],
      summary: 'Create a new booking',
      description: 'Create a new booking and associated details',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                vehicleId: { type: 'string' },
                pickupLocationId: { type: 'string' },
                dropOffLocationId: { type: 'string' },
                pickupDate: { type: 'string', format: 'date-time' },
                dropOffDate: { type: 'string', format: 'date-time' },
                hasGps: { type: 'boolean' },
                hasFullInsurance: { type: 'boolean' },
                hasAdditionalDriver: { type: 'boolean' },
                hasChildSeat: { type: 'boolean' },
                driverDetails: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' }
                  }
                },
                billingInfo: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    address: { type: 'string' },
                    city: { type: 'string' },
                    country: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Booking created successfully'
        }
      }
    },
    get: {
      tags: ['Bookings'],
      summary: 'Get all bookings',
      description: 'Retrieve all bookings with pagination (Admin only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer' }
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer' }
        }
      ],
      responses: {
        '200': {
          description: 'Bookings retrieved successfully'
        }
      }
    }
  },
  '/api/v1/bookings/my-bookings': {
    get: {
      tags: ['Bookings'],
      summary: 'Get my bookings',
      description: 'Retrieve bookings for the currently authenticated user',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Bookings retrieved successfully'
        }
      }
    }
  },
  '/api/v1/bookings/{id}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Booking retrieved successfully'
        }
      }
    }
  },
  '/api/v1/bookings/{id}/status': {
    patch: {
      tags: ['Bookings'],
      summary: 'Update booking status',
      description: 'Update status of a booking. Sets vehicle availability when status changes to ONGOING/COMPLETED (Admin only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED'] },
                assignedDriverId: { type: 'string', description: 'Assign a chauffeur (Admin only)' }
              },
              required: ['status']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Booking status updated successfully'
        }
      }
    }
  }
};
