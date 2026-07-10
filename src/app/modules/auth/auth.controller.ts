import type { RequestHandler } from 'express';

import AppError from '../../errors/AppError';
import config from '../../config';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthService } from './auth.service';

const register: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.register(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'User registered successfully.',
    data: result
  });
});

const login: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.login(req.body);
  const { refreshToken, ...data } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User logged in successfully.',
    data: data
  });
});

const refreshToken: RequestHandler = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await AuthService.refreshToken(refreshToken);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Access token generated successfully.',
    data: result
  });
});

const logout: RequestHandler = catchAsync(async (_req, res) => {
  res.clearCookie('refreshToken', {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'strict'
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Logged out successfully.',
    data: null
  });
});

const changePassword: RequestHandler = catchAsync(async (req, res) => {
  // `req.user` is set by the auth middleware
  if (!req.user) {
    throw new AppError(401, 'You are not authorized.');
  }
  const userId = req.user.userId;

  await AuthService.changePassword(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Password changed successfully.',
    data: null
  });
});

const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
  await AuthService.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'If the email exists, a password reset code has been sent.',
    data: null
  });
});

const verifyResetCode: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.verifyResetCode(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Code verified successfully. You can now reset your password.',
    data: result // Contains the temporary reset token
  });
});

const resetPassword: RequestHandler = catchAsync(async (req, res) => {
  await AuthService.resetPassword(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Password has been reset successfully.',
    data: null
  });
});

export const AuthController = {
  register,
  login,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword
};
