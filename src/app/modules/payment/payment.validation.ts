import { z } from 'zod';

const createExtensionCheckoutSession = z.object({
  body: z
    .object({
      bookingId: z.string().uuid('bookingId must be a valid UUID')
    })
    .strict()
});

const getPaymentStatus = z.object({
  query: z.object({
    orderTrackingId: z.string().min(1, 'orderTrackingId is required')
  })
});

const paymentIdParams = z.object({
  params: z.object({ id: z.string().uuid('payment id must be a valid UUID') })
});

const reviewPayment = z.object({
  params: z.object({ id: z.string().uuid('payment id must be a valid UUID') }),
  body: z.object({ action: z.enum(['CONFIRM', 'REFUND']) }).strict()
});

export const PaymentValidation = {
  createExtensionCheckoutSession,
  getPaymentStatus,
  paymentIdParams,
  reviewPayment
};
