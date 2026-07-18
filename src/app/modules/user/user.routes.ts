import { Router } from 'express';

import auth from '../../middlewares/auth';
import { createUploader } from '../../utils/upload';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';

const router = Router();
const profileUploader = createUploader('profiles');
const documentUploader = createUploader('documents');

// ==========================================
// User / Customer Endpoints
// ==========================================

router.get('/me', auth('USER', 'ADMIN'), UserController.getMe);

router.patch(
  '/profile',
  auth('USER', 'ADMIN'),
  profileUploader.fields([{ name: 'photo', maxCount: 1 }]),
  validateRequest(UserValidation.updateProfile),
  UserController.updateProfile
);

router.patch(
  '/password',
  auth('USER', 'ADMIN'),
  validateRequest(UserValidation.changePassword),
  UserController.changePassword
);

router.post(
  '/documents',
  auth('USER', 'ADMIN'),
  documentUploader.fields([{ name: 'document', maxCount: 1 }]),
  validateRequest(UserValidation.uploadDocument),
  UserController.uploadDocument
);

router.delete(
  '/documents/:docId',
  auth('USER', 'ADMIN'),
  UserController.deleteDocument
);

// ==========================================
// Admin Endpoints
// ==========================================

router.get('/', auth('ADMIN'), UserController.getAllUsers);

router.get('/:id', auth('ADMIN'), UserController.getUserById);

router.patch(
  '/:id/role',
  auth('ADMIN'),
  validateRequest(UserValidation.changeRole),
  UserController.changeRole
);

router.patch(
  '/documents/:docId/status',
  auth('ADMIN'),
  validateRequest(UserValidation.updateDocumentStatus),
  UserController.updateDocumentStatus
);

router.patch(
  '/:id',
  auth('ADMIN'),
  validateRequest(UserValidation.adminUpdateUser),
  UserController.adminUpdateUser
);

// Support both /:id and bulk body array in root
router.delete('/:id', auth('ADMIN'), UserController.deleteUser);
router.delete('/', auth('ADMIN'), UserController.deleteUser);

export const UserRoutes = router;
