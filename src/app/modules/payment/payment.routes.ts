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
 * Returns: { url: string, sessionId: string }
 * Frontend redirects user to `url`.
 */
router.post(
  '/create-extension-session',
  auth('USER', 'ADMIN'),
  validateRequest(PaymentValidation.createExtensionCheckoutSession),
  PaymentController.createExtensionCheckoutSession
);

router.get('/my-payments', auth('USER', 'ADMIN'), PaymentController.getMyPayments);

/**
 * POST /api/v1/payments/webhook
 * Called ONLY by Stripe (no auth middleware).
 * IMPORTANT: Uses express.raw() body parser (configured in app.ts) to get the raw body for signature verification.
 */
router.post('/webhook', PaymentController.stripeWebhook);

export const PaymentRoutes = router;
