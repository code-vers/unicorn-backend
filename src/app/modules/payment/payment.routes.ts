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
 * GET / POST /api/v1/payments/pesapal/ipn
 * Called by Pesapal IPN (no JWT auth; verified via IPN token + GetTransactionStatus).
 */
router.get('/pesapal/ipn', PaymentController.pesapalIpn);
router.post('/pesapal/ipn', PaymentController.pesapalIpn);

router.get(
  '/status',
  auth('USER', 'ADMIN'),
  validateRequest(PaymentValidation.getPaymentStatus),
  PaymentController.getPaymentStatus
);

router.get('/my-payments', auth('USER', 'ADMIN'), PaymentController.getMyPayments);

router.post(
  '/:id/review',
  auth('ADMIN'),
  validateRequest(PaymentValidation.reviewPayment),
  PaymentController.reviewPayment
);

router.post(
  '/:id/refresh',
  auth('ADMIN'),
  validateRequest(PaymentValidation.paymentIdParams),
  PaymentController.refreshPaymentStatus
);

export const PaymentRoutes = router;
