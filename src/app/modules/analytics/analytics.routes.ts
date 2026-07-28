import { Router } from 'express';
import auth from '../../middlewares/auth';
import { AnalyticsController } from './analytics.controller';

const router = Router();

router.get('/overview', auth('ADMIN'), AnalyticsController.getOverview);
router.get('/revenue-trends', auth('ADMIN'), AnalyticsController.getRevenueTrends);
router.get('/booking-trends', auth('ADMIN'), AnalyticsController.getBookingTrends);
router.get('/vehicle-stats', auth('ADMIN'), AnalyticsController.getVehicleStats);
router.get('/performance', auth('ADMIN'), AnalyticsController.getPerformance);

export const AnalyticsRoutes = router;
