import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PricingController } from './pricing.controller';
import { PricingValidation } from './pricing.validation';

const router = Router();

router.put(
  '/',
  auth('ADMIN'),
  validateRequest(PricingValidation.savePricing),
  PricingController.savePricing
);

router.get(
  '/',
  PricingController.getPricing
);

router.delete(
  '/:vehicleId',
  auth('ADMIN'),
  PricingController.deletePricing
);

export const PricingRoutes = router;
