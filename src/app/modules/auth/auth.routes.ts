import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

router.post('/register', authRateLimiter, validateRequest(AuthValidation.register), AuthController.register);
router.post('/login', authRateLimiter, validateRequest(AuthValidation.login), AuthController.login);

router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshToken),
  AuthController.refreshToken
);

router.post('/logout', AuthController.logout);

router.post(
  '/change-password',
  auth('USER', 'ADMIN'),
  validateRequest(AuthValidation.changePassword),
  AuthController.changePassword
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest(AuthValidation.forgotPassword),
  AuthController.forgotPassword
);

router.post(
  '/verify-reset-code',
  authRateLimiter,
  validateRequest(AuthValidation.verifyResetCode),
  AuthController.verifyResetCode
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest(AuthValidation.resetPassword),
  AuthController.resetPassword
);

export const AuthRoutes = router;
