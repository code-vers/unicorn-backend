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
    description: 'Pesapal Checkout URL. Redirect the user to this URL to complete payment.'
  }),
  reference: z.string().openapi({ description: 'Merchant payment reference.' })
});

export const registerPaymentSwagger = (
  registry: OpenAPIRegistry,
  bearerAuth: { name: string }
): void => {
  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/create-extension-session',
    tags: ['Payments (Pesapal)'],
    summary: 'Create a Pesapal checkout for a booking extension',
    description: 'Creates a Pesapal-hosted checkout for the outstanding extension balance.',
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
    method: 'get',
    path: '/api/v1/payments/pesapal/ipn',
    tags: ['Payments (Pesapal)'],
    summary: 'Pesapal IPN listener',
    description:
      'Internal endpoint for Pesapal IPN notifications. Reconciles transaction status via GetTransactionStatus.',
    request: {
      query: z.object({
        OrderTrackingId: z.string(),
        OrderMerchantReference: z.string(),
        OrderNotificationType: z.string(),
        token: z.string().optional()
      })
    },
    responses: {
      200: { description: 'IPN acknowledged.' },
      400: Error400,
      401: Error401,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/payments/status',
    tags: ['Payments (Pesapal)'],
    summary: 'Check Pesapal payment status',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({ orderTrackingId: z.string() })
    },
    responses: {
      200: createSuccessResponse(z.any(), 'Payment status retrieved.', 'Current payment status.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/{id}/review',
    tags: ['Payments (Pesapal)'],
    summary: 'Resolve a late Pesapal payment',
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

  registry.registerPath({
    method: 'post',
    path: '/api/v1/payments/{id}/refresh',
    tags: ['Payments (Pesapal)'],
    summary: 'Manually reconcile a Pesapal payment status',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({ id: z.string() })
    },
    responses: {
      200: createSuccessResponse(
        z.any(),
        'Payment status refreshed.',
        'Latest status from Pesapal reconciled.'
      ),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
