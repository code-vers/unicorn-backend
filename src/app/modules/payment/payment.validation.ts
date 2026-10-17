import { z } from 'zod';

const createExtensionCheckoutSession = z.object({
  body: z
    .object({
      bookingId: z.string().uuid('bookingId must be a valid UUID')
    })
    .strict()
});

const reviewPayment = z.object({
  params: z.object({ id: z.string().uuid('payment id must be a valid UUID') }),
  body: z.object({ action: z.enum(['CONFIRM', 'REFUND']) }).strict()
});

export const PaymentValidation = {
  createExtensionCheckoutSession,
  reviewPayment
};
