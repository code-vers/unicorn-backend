import { Router } from 'express';

import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { LocationController } from './location.controller';
import { LocationValidation } from './location.validation';

const router = Router();

router.post(
  '/',
  auth('ADMIN'),
  validateRequest(LocationValidation.create),
  LocationController.createLocation
);

router.get('/', auth('USER', 'ADMIN'), LocationController.getAllLocations);

router.get('/:id', auth('USER', 'ADMIN'), LocationController.getLocationById);

router.patch(
  '/:id',
  auth('ADMIN'),
  validateRequest(LocationValidation.update),
  LocationController.updateLocation
);

router.delete('/:id', auth('ADMIN'), LocationController.deleteLocation);

export const LocationRoutes = router;
