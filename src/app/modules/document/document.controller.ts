import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { DocumentStatus, DocumentType } from '@prisma/client';
import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DocumentService } from './document.service';

const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    throw new AppError(400, 'Please upload a document file');
  }

  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(401, 'You are not authorized');
  }

  const type = req.body.type as DocumentType;
  if (!Object.values(DocumentType).includes(type)) {
    throw new AppError(
      400,
      `Invalid document type. Expected one of: ${Object.values(DocumentType).join(', ')}`
    );
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const fileName = `${randomUUID()}${extension}`;
  const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'documents');
  const storedFilePath = path.join(uploadDirectory, fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(storedFilePath, file.buffer);

  const fileUrl = `/uploads/documents/${fileName}`;
  const payload = {
    ...req.body,
    userId,
    type,
    name: req.body.name || file.originalname,
  };

  let result;
  try {
    result = await DocumentService.uploadDocument(payload, fileUrl);
  } catch (error) {
    await unlink(storedFilePath).catch(() => undefined);
    throw error;
  }

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Document uploaded successfully',
    data: result
  });
});

const getAllDocuments = catchAsync(async (req: Request, res: Response) => {
  const result = await DocumentService.getAllDocuments();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Documents retrieved successfully',
    data: result
  });
});

const getMyDocuments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await DocumentService.getDocumentsByUserId(userId!);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User documents retrieved successfully',
    data: result
  });
});

const updateDocumentStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const status = req.body.status as DocumentStatus;
  if (!Object.values(DocumentStatus).includes(status)) {
    throw new AppError(
      400,
      `Invalid document status. Expected one of: ${Object.values(DocumentStatus).join(', ')}`
    );
  }
  const result = await DocumentService.updateDocumentStatus(id, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Document status updated successfully',
    data: result
  });
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await DocumentService.deleteDocument(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Document deleted successfully',
    data: null
  });
});

export const DocumentController = {
  uploadDocument,
  getAllDocuments,
  getMyDocuments,
  updateDocumentStatus,
  deleteDocument
};
