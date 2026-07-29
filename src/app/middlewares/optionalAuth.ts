import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import config from '../config';
import type { IAuthUser, UserRole } from '../interfaces/auth.interface';

const isAuthUser = (payload: unknown): payload is IAuthUser => {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Record<string, unknown>;
  const role = candidate.role as UserRole;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    (role === 'USER' || role === 'ADMIN')
  );
};

/**
 * Optional auth middleware — attaches req.user if a valid JWT is present,
 * but does NOT block the request if there is no token. This allows public
 * routes to still distinguish between guests and logged-in users.
 */
const optionalAuth: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // No token — proceed as guest (req.user remains undefined)
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    if (isAuthUser(decoded)) {
      req.user = decoded;
    }
  } catch {
    // Invalid / expired token — treat as guest, don't block
  }

  return next();
};

export default optionalAuth;
