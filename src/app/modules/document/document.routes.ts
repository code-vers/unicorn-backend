import { Router } from 'express';
import auth from '../../middlewares/auth';
import { createUploader } from '../../utils/upload';
import { DocumentController } from './document.controller';

const router = Router();
const upload = createUploader('documents');

// Admin only routes
router.get('/', auth('ADMIN'), DocumentController.getAllDocuments);
router.patch('/:id/status', auth('ADMIN'), DocumentController.updateDocumentStatus);
router.delete('/:id', auth('ADMIN'), DocumentController.deleteDocument);

// User routes
router.post(
  '/',
  auth('USER', 'ADMIN'),
  upload.single('file'),
  DocumentController.uploadDocument
);
router.get('/my-documents', auth('USER', 'ADMIN'), DocumentController.getMyDocuments);

export const DocumentRoutes = router;
