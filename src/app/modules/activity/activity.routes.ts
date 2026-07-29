import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ActivityController } from './activity.controller';

const router = Router();

router.get('/', auth('ADMIN'), ActivityController.getRecentActivity);

export const ActivityRoutes = router;
