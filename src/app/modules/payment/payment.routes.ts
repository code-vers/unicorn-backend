import { Router } from 'express';
import auth from '../../middlewares/auth';
import { PaymentController } from './payment.controller';

const router = Router();

/**
 * POST /api/v1/payments/create-checkout-session
 * Auth: USER or ADMIN
 * Body: { bookingId: string }
 * Returns: { url: string, sessionId: string }
 * Frontend redirects user to `url`.
 */
router.post(
  '/create-checkout-session',
  auth('USER', 'ADMIN'),
  PaymentController.createCheckoutSession
);

/**
 * POST /api/v1/payments/create-extension-session
 * Auth: USER or ADMIN
 * Body: { bookingId: string, extensionAmount: number }
 * Returns: { url: string, sessionId: string }
 * Frontend redirects user to `url`.
 */
router.post(
  '/create-extension-session',
  auth('USER', 'ADMIN'),
  PaymentController.createExtensionCheckoutSession
);

/**
 * POST /api/v1/payments/webhook
 * Called ONLY by Stripe (no auth middleware).
 * IMPORTANT: Uses express.raw() body parser (configured in app.ts) to get the raw body for signature verification.
 */
router.post('/webhook', PaymentController.stripeWebhook);

export const PaymentRoutes = router;
