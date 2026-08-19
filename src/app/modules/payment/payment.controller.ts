import type { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

/**
 * POST /api/v1/payments/create-extension-session
 * Creates a Stripe Checkout Session for a booking extension.
 * Frontend should redirect user to the returned `url`.
 */
const createExtensionCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { bookingId } = req.body;

  const result = await PaymentService.createExtensionCheckoutSession(bookingId, userId);

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
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    res.status(400).json({ success: false, message: 'Stripe signature is required.' });
    return;
  }
  // req.body here is the raw Buffer because of express.raw() in app.ts
  await PaymentService.handleWebhook(req.body as Buffer, signature);
  // Stripe requires a 200 response quickly to acknowledge receipt
  res.status(200).json({ received: true });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getMyPayments(req.user!.userId, req.user!.role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments retrieved successfully.',
    data: result
  });
});

export const PaymentController = {
  createExtensionCheckoutSession,
  getMyPayments,
  stripeWebhook
};
