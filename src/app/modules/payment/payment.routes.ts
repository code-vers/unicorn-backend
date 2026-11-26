import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentController } from './payment.controller';
import { PaymentValidation } from './payment.validation';

const router = Router();

/**
 * POST /api/v1/payments/create-extension-session
 * Auth: USER or ADMIN
 * Body: { bookingId: string }
 * Returns: { url: string, reference: string }
 * Frontend redirects user to `url`.
 */
router.post(
  '/create-extension-session',
  auth('USER', 'ADMIN'),
  validateRequest(PaymentValidation.createExtensionCheckoutSession),
  PaymentController.createExtensionCheckoutSession
);

/**
 * POST /api/v1/payments/webhook
 * Called ONLY by Paystack (no auth middleware).
 * IMPORTANT: Uses express.raw() body parser (configured in app.ts) to get the raw body for signature verification.
 */
router.post('/webhook', PaymentController.paystackWebhook);

router.get('/my-payments', auth('USER', 'ADMIN'), PaymentController.getMyPayments);
router.post(
  '/:id/review',
  auth('ADMIN'),
  validateRequest(PaymentValidation.reviewPayment),
  PaymentController.reviewPayment
);

export const PaymentRoutes = router;
