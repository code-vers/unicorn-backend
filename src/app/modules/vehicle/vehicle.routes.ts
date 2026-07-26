import { Router } from 'express';

import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';
import validateRequest from '../../middlewares/validateRequest';
import { createUploader } from '../../utils/upload';
import { VehicleController } from './vehicle.controller';
import { VehicleValidation } from './vehicle.validation';

const router = Router();
const upload = createUploader('vehicles');

router.post(
  '/',
  auth('ADMIN'),
  upload.array('images', 5), // Max 5 images per upload
  validateRequest(VehicleValidation.create),
  VehicleController.createVehicle
);

// Public: anyone can browse vehicles (homepage, product listing)
router.get('/', optionalAuth, VehicleController.getAllVehicles);

// Public: anyone can view a single vehicle detail page
router.get('/:id', optionalAuth, VehicleController.getVehicleById);

router.patch(
  '/:id',
  auth('ADMIN'),
  upload.array('images', 5),
  validateRequest(VehicleValidation.update),
  VehicleController.updateVehicle
);

router.patch(
  '/:id/availability',
  auth('ADMIN'),
  validateRequest(VehicleValidation.updateAvailability),
  VehicleController.updateAvailability
);

router.delete('/:id', auth('ADMIN'), VehicleController.deleteVehicle);

export const VehicleRoutes = router;
