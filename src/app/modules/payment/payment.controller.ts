import type { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

/**
 * POST /api/v1/payments/create-extension-session
 * Creates a Pesapal checkout order for a booking extension.
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
 * GET / POST /api/v1/payments/pesapal/ipn
 * Called by Pesapal when a transaction status changes.
 * Responds with Pesapal's required JSON acknowledgement.
 */
const pesapalIpn = catchAsync(async (req: Request, res: Response) => {
  const source = req.method === 'GET' ? req.query : req.body;
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;

  const ack = await PaymentService.handleIpn(
    {
      OrderTrackingId:
        typeof source?.OrderTrackingId === 'string' ? source.OrderTrackingId : undefined,
      OrderMerchantReference:
        typeof source?.OrderMerchantReference === 'string'
          ? source.OrderMerchantReference
          : undefined,
      OrderNotificationType:
        typeof source?.OrderNotificationType === 'string' ? source.OrderNotificationType : undefined
    },
    token
  );

  res.status(200).json(ack);
});

const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const orderTrackingId = req.query.orderTrackingId as string;
  const result = await PaymentService.getPaymentStatus(
    orderTrackingId,
    req.user!.userId,
    req.user!.role
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment status retrieved successfully.',
    data: result
  });
});

const reviewPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.reviewPayment(
    req.params.id as string,
    req.body.action,
    req.user!.email
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment review completed.',
    data: result
  });
});

const refreshPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.refreshPaymentStatus(req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment status refreshed successfully.',
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
  getPaymentStatus,
  pesapalIpn,
  refreshPaymentStatus,
  reviewPayment
};
