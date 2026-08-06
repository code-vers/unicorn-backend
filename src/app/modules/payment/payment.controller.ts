import type { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

/**
 * POST /api/v1/payments/create-checkout-session
 * Creates a Stripe Checkout Session and returns the redirect URL.
 * Frontend should redirect user to the returned `url`.
 */
const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { bookingId } = req.body;

  const result = await PaymentService.createCheckoutSession(bookingId, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Checkout session created successfully.',
    data: result
  });
});

/**
 * POST /api/v1/payments/create-extension-session
 * Creates a Stripe Checkout Session for a booking extension.
 * Frontend should redirect user to the returned `url`.
 */
const createExtensionCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { bookingId, extensionAmount } = req.body;

  const result = await PaymentService.createExtensionCheckoutSession(bookingId, userId, extensionAmount);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Extension checkout session created successfully.',
    data: result
  });
});

/**
 * POST /api/v1/payments/webhook
 * Called exclusively by Stripe after a successful payment.
 * Requires raw body (NOT parsed JSON) — handled in app.ts.
 */
const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  // req.body here is the raw Buffer because of express.raw() in app.ts
  await PaymentService.handleWebhook(req.body as Buffer, signature);
  // Stripe requires a 200 response quickly to acknowledge receipt
  res.status(200).json({ received: true });
});

export const PaymentController = {
  createCheckoutSession,
  createExtensionCheckoutSession,
  stripeWebhook
};
