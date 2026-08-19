import { z } from 'zod';

const createExtensionCheckoutSession = z.object({
  body: z
    .object({
      bookingId: z.string().uuid('bookingId must be a valid UUID')
    })
    .strict()
});

export const PaymentValidation = {
  createExtensionCheckoutSession
};
