import type { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

/**
 * POST /api/v1/payments/create-extension-session
 * Creates a Paystack Checkout session for a booking extension.
 * Frontend should redirect user to the returned `url`.
 */
const createExtensionCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { bookingId } = req.body;

  const result = await PaymentService.createExtensionCheckoutSession(bookingId, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Extension checkout created successfully.',
    data: result
  });
});

/**
 * POST /api/v1/payments/webhook
 * Called exclusively by Paystack for payment and refund events.
 * Requires raw body (NOT parsed JSON) — handled in app.ts.
 */
const paystackWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'];
  if (typeof signature !== 'string') {
    res.status(400).json({ success: false, message: 'Paystack signature is required.' });
    return;
  }
  // req.body here is the raw Buffer because of express.raw() in app.ts
  await PaymentService.handleWebhook(req.body as Buffer, signature);
  // Paystack retries non-200 webhook responses, so acknowledge promptly after processing.
  res.status(200).json({ received: true });
});

const reviewPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.reviewPayment(req.params.id as string, req.body.action);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment review completed.',
    data: result
  });
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
  paystackWebhook,
  reviewPayment
};
