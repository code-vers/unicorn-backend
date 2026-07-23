import { Router } from 'express';
import auth from '../../middlewares/auth';
import { FeatureController } from './feature.controller';

const router = Router();

router.post('/', auth('ADMIN'), FeatureController.createFeature);
router.get('/', FeatureController.getAllFeatures);
router.get('/:id', FeatureController.getFeatureById);
router.patch('/:id', auth('ADMIN'), FeatureController.updateFeature);
router.delete('/:id', auth('ADMIN'), FeatureController.deleteFeature);

export const FeatureRoutes = router;
