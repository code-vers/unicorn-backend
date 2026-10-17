import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  Error400,
  Error401,
  Error403,
  Error404,
  Error500,
  createSuccessResponse
} from '../../utils/swaggerHelpers';

const CheckoutResponseSchema = z.object({
  url: z.string().openapi({
    description: 'Paystack Checkout URL. Redirect the user to this URL to complete payment.'
  }),
  reference: z.string().openapi({ description: 'Paystack transaction reference.' })
});

export const registerPaymentSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/create-extension-session',
    tags: ['Payments (Paystack)'],
    summary: 'Create a Paystack checkout for a booking extension',
    description: 'Creates a Paystack-hosted checkout for the outstanding extension balance.',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: { content: { 'application/json': { schema: z.object({ bookingId: z.string() }) } } }
    },
    responses: {
      200: createSuccessResponse(
        CheckoutResponseSchema,
        'Extension checkout created.',
        'Redirect user to the returned URL.'
      ),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/webhook',
    tags: ['Payments (Paystack)'],
    summary: 'Paystack webhook endpoint',
    description: 'Internal endpoint for signed Paystack payment and refund events.',
    request: {
      headers: z.object({
        'x-paystack-signature': z
          .string()
          .openapi({ description: 'Paystack HMAC-SHA512 webhook signature.' })
      })
    },
    responses: {
      200: { description: 'Webhook received and processed.' },
      400: Error400,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/{id}/review',
    tags: ['Payments (Paystack)'],
    summary: 'Resolve a late Paystack payment',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': { schema: z.object({ action: z.enum(['CONFIRM', 'REFUND']) }) }
        }
      }
    },
    responses: {
      200: createSuccessResponse(
        z.any(),
        'Payment review completed.',
        'Payment was confirmed or a refund was requested.'
      ),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
