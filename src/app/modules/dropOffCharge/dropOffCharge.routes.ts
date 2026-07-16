import { Router } from 'express';

import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { DropOffChargeController } from './dropOffCharge.controller';
import { DropOffChargeValidation } from './dropOffCharge.validation';

const router = Router();

router.post(
  '/',
  auth('ADMIN'),
  validateRequest(DropOffChargeValidation.create),
  DropOffChargeController.createCharge
);

router.get('/', auth('ADMIN'), DropOffChargeController.getAllCharges);

router.get('/:id', auth('ADMIN'), DropOffChargeController.getChargeById);

router.patch(
  '/:id',
  auth('ADMIN'),
  validateRequest(DropOffChargeValidation.update),
  DropOffChargeController.updateCharge
);

router.delete('/:id', auth('ADMIN'), DropOffChargeController.deleteCharge);

export const DropOffChargeRoutes = router;
