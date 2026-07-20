import { Router } from 'express';

import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
// import { createUploader } from '../../utils/upload';
import { DriverController } from './driver.controller';
import { DriverValidation } from './driver.validation';

const router = Router();
// const upload = createUploader('drivers');

router.post(
  '/',
  auth('ADMIN'),
  // upload.fields([
  //   { name: 'photo', maxCount: 1 },
  //   { name: 'licensePhoto', maxCount: 1 }
  // ]),
  validateRequest(DriverValidation.create),
  DriverController.createDriver
);

router.get('/', auth('ADMIN'), DriverController.getAllDrivers);

router.get('/:id', auth('ADMIN'), DriverController.getDriverById);

router.patch(
  '/:id',
  auth('ADMIN'),
  // upload.fields([
  //   { name: 'photo', maxCount: 1 },
  //   { name: 'licensePhoto', maxCount: 1 }
  // ]),
  validateRequest(DriverValidation.update),
  DriverController.updateDriver
);

router.patch(
  '/:id/availability',
  auth('ADMIN'),
  validateRequest(DriverValidation.updateAvailability),
  DriverController.updateAvailability
);

router.delete('/:id', auth('ADMIN'), DriverController.deleteDriver);

export const DriverRoutes = router;
