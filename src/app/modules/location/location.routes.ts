import { Router } from 'express';

import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';
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

router.get('/', optionalAuth, LocationController.getAllLocations);

router.get('/:id', optionalAuth, LocationController.getLocationById);

router.patch(
  '/:id',
  auth('ADMIN'),
  validateRequest(LocationValidation.update),
  LocationController.updateLocation
);

router.delete('/bulk', auth('ADMIN'), LocationController.deleteLocation);
router.delete('/:id', auth('ADMIN'), LocationController.deleteLocation);

export const LocationRoutes = router;
