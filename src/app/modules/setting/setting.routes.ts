import { Router } from 'express';

import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SettingController } from './setting.controller';
import { SettingValidation } from './setting.validation';

const router = Router();

router.get(
  '/',
  auth('ADMIN'),
  SettingController.getAllSettings
);

router.get(
  '/:key',
  SettingController.getSettingByKey
);

router.post(
  '/',
  auth('ADMIN'),
  validateRequest(SettingValidation.createSettingZodSchema),
  SettingController.upsertSetting
);

router.delete(
  '/:key',
  auth('ADMIN'),
  SettingController.deleteSetting
);

export const SettingRoutes = router;
