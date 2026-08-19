import { Router } from 'express';

import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';
import validateRequest from '../../middlewares/validateRequest';
import { SupportController } from './support.controller';
import { SupportValidation } from './support.validation';

const router = Router();

router.post(
  '/',
  optionalAuth,
  validateRequest(SupportValidation.createTicket),
  SupportController.createTicket
);
router.get('/', auth('ADMIN'), SupportController.getAllTickets);
router.get('/:id', auth('ADMIN'), SupportController.getTicketById);
router.patch(
  '/:id/status',
  auth('ADMIN'),
  validateRequest(SupportValidation.updateStatus),
  SupportController.updateTicketStatus
);

export const SupportRoutes = router;
