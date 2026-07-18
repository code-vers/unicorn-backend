import type { RequestHandler } from 'express';

import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';

const getMe: RequestHandler = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'You are not authorized.');
  }

  const userId = req.user.userId;
  const result = await UserService.getMe(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User profile retrieved successfully.',
    data: result
  });
});

const updateProfile: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  let photoUrl: string | undefined = undefined;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (files?.photo?.[0]) {
    photoUrl = `/uploads/profiles/${files.photo[0].filename}`;
  }

  const result = await UserService.updateProfile(userId, req.body, photoUrl);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Profile updated successfully.',
    data: result
  });
});

const changePassword: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  await UserService.changePassword(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Password changed successfully.',
    data: null
  });
});

const uploadDocument: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files?.document?.[0]) {
    throw new AppError(400, 'Document file is required.');
  }

  const documentPath = `/uploads/documents/${files.document[0].filename}`;
  const result = await UserService.uploadDocument(userId, req.body, documentPath);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Document uploaded successfully.',
    data: result
  });
});

const deleteDocument: RequestHandler = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const docId = req.params['docId'] as string;
  const isAdmin = req.user!.role === 'ADMIN';

  await UserService.deleteDocument(userId, docId, isAdmin);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Document deleted successfully.',
    data: null
  });
});

const updateDocumentStatus: RequestHandler = catchAsync(async (req, res) => {
  const docId = req.params['docId'] as string;
  const { status } = req.body;
  const result = await UserService.updateDocumentStatus(docId, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Document status updated successfully.',
    data: result
  });
});

const getAllUsers: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const getUserById: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await UserService.getUserById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User retrieved successfully.',
    data: result
  });
});

const adminUpdateUser: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await UserService.adminUpdateUser(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User updated successfully.',
    data: result
  });
});

const changeRole: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserService.changeRole(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User role updated successfully.',
    data: result
  });
});

const deleteUser: RequestHandler = catchAsync(async (req, res) => {
  const idOrIds = Array.isArray(req.body) && req.body.length > 0 ? req.body : req.params['id'] as string;
  await UserService.deleteUser(idOrIds);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User(s) deleted successfully.',
    data: null
  });
});

export const UserController = {
  getMe,
  updateProfile,
  changePassword,
  uploadDocument,
  deleteDocument,
  updateDocumentStatus,
  getAllUsers,
  getUserById,
  adminUpdateUser,
  changeRole,
  deleteUser
};
