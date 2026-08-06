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

const CheckoutSessionResponseSchema = z.object({
  url: z.string().openapi({ description: 'Stripe Checkout URL. Redirect the user to this URL to complete payment.' }),
  sessionId: z.string().openapi({ description: 'Stripe Checkout Session ID.' })
});

export const registerPaymentSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {

  // POST /payments/create-checkout-session
  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/create-checkout-session',
    tags: ['Payments (Stripe)'],
    summary: 'Create a Stripe Checkout Session for a booking',
    description: 'Returns a Stripe-hosted checkout `url`. The frontend must redirect the user to this URL to complete payment. On success, Stripe redirects to `/payment/success`. On cancel, to `/payment/cancel`.',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              bookingId: z.string().openapi({ description: 'The ID of the booking to pay for.' })
            })
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(CheckoutSessionResponseSchema, 'Checkout session created.', 'Checkout session created. Redirect user to the returned `url`.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // POST /payments/create-extension-session
  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/create-extension-session',
    tags: ['Payments (Stripe)'],
    summary: 'Create a Stripe Checkout Session for a booking extension',
    description: 'Use this after calling `PATCH /bookings/{id}/modify` to change the return date. Returns a Stripe-hosted checkout URL for the extension amount only.',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              bookingId: z.string().openapi({ description: 'The ID of the booking being extended.' }),
              extensionAmount: z.number().openapi({ description: 'The additional amount due for the extension (in USD).' })
            })
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(CheckoutSessionResponseSchema, 'Extension checkout session created.', 'Redirect user to the returned `url`.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // POST /payments/webhook
  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/webhook',
    tags: ['Payments (Stripe)'],
    summary: 'Stripe Webhook Endpoint (Internal — Do NOT call from frontend)',
    description: 'This endpoint is called automatically by Stripe after a successful payment. It verifies the Stripe signature and updates the booking status in the database.',
    request: {
      headers: z.object({
        'stripe-signature': z.string().openapi({ description: 'Stripe webhook signature for verification.' })
      })
    },
    responses: {
      200: {
        description: 'Webhook received and processed.',
        content: {
          'application/json': {
            schema: z.object({ received: z.boolean() })
          }
        }
      },
      400: Error400,
      500: Error500
    }
  });
};
