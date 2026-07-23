import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SupportController } from './support.controller';

const router = Router();

// To allow both logged-in (client dashboard) and public users (website),
// we don't strictly enforce auth middleware for creation.
// But we use a custom middleware or just let the controller handle req.user if present.
// For now, no auth middleware for POST so anyone can submit.
// But we can check token manually if we want, or just rely on 'express-jwt' setting req.user if token is present, even if not enforced.
// Wait, our auth middleware throws if token is invalid or missing. 
// Let's create a custom 'optionalAuth' or just let the controller handle it without auth middleware.
// If it's a client dashboard, they can just send the token, but we won't strictly enforce it here.
// Let's create an optional auth helper or just assume they will pass name/email if public.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';

const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret as string);
      req.user = decoded as any;
    } catch (err) {
      // ignore token error for optional auth
    }
  }
  next();
};

router.post('/', optionalAuth, SupportController.createTicket);
router.get('/', auth('ADMIN'), SupportController.getAllTickets);
router.get('/:id', auth('ADMIN'), SupportController.getTicketById);
router.patch('/:id/status', auth('ADMIN'), SupportController.updateTicketStatus);

export const SupportRoutes = router;
