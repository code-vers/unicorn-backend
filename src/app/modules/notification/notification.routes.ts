import { Router } from 'express';
import auth from '../../middlewares/auth';
import { NotificationController } from './notification.controller';

const router = Router();

router.get('/', auth('USER', 'ADMIN'), NotificationController.getUserNotifications);
router.patch('/read-all', auth('USER', 'ADMIN'), NotificationController.markAllAsRead);
router.patch('/:id/read', auth('USER', 'ADMIN'), NotificationController.markAsRead);

export const NotificationRoutes = router;
