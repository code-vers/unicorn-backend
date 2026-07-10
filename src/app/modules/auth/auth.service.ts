import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import config from '../../config';
import AppError from '../../errors/AppError';
import { sendEmail } from '../../utils/email';
import prisma from '../../utils/prisma';
import type {
  IChangePasswordPayload,
  IForgotPasswordPayload,
  ILoginResponse,
  IRefreshTokenResponse,
  IResetPasswordPayload,
  IUserLoginPayload,
  IUserRegisterPayload,
  IUserResponse,
  IVerifyResetCodePayload
} from './auth.interface';

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

const sanitizeUser = (user: UserRecord): IUserResponse => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

const register = async (payload: IUserRegisterPayload): Promise<IUserResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email
    }
  });

  if (existingUser) {
    throw new AppError(409, 'A user with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(payload.password, config.bcryptSaltRounds);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      role: payload.role ?? 'USER'
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  return sanitizeUser(user);
};

const login = async (payload: IUserLoginPayload): Promise<ILoginResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email
    }
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const isPasswordMatched = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const authPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(authPayload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn
  });

  const refreshToken = jwt.sign(authPayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user)
  };
};

const refreshToken = async (token: string): Promise<IRefreshTokenResponse> => {
  let decoded: any;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    throw new AppError(401, 'Invalid or expired refresh token.');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    throw new AppError(404, 'User does not exist.');
  }

  const authPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(authPayload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn
  });

  return {
    accessToken
  };
};

const changePassword = async (
  userId: string,
  payload: IChangePasswordPayload
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  const isPasswordMatched = await bcrypt.compare(payload.oldPassword, user.password);

  if (!isPasswordMatched) {
    throw new AppError(403, 'Old password does not match.');
  }

  const newHashedPassword = await bcrypt.hash(payload.newPassword, config.bcryptSaltRounds);

  await prisma.user.update({
    where: { id: userId },
    data: { password: newHashedPassword }
  });
};

const forgotPassword = async (payload: IForgotPasswordPayload): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (!user) {
    // We don't throw an error here to prevent email enumeration.
    return;
  }

  // Generate a random 6-digit code
  const resetCode = crypto.randomInt(100000, 999999).toString();
  
  // Set expiration to 15 minutes from now
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Hash the code before saving it to the database for security
  const hashedResetCode = await bcrypt.hash(resetCode, config.bcryptSaltRounds);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetCode: hashedResetCode,
      passwordResetExpires: expiresAt
    }
  });

  // Send the email with the unhashed 6-digit code
  const emailHtml = `
    <h1>Password Reset Request</h1>
    <p>Your password reset code is: <strong>${resetCode}</strong></p>
    <p>This code will expire in 15 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;

  await sendEmail(user.email, 'Password Reset Code', emailHtml);
};

const verifyResetCode = async (
  payload: IVerifyResetCodePayload
): Promise<{ resetToken: string }> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (
    !user ||
    !user.passwordResetCode ||
    !user.passwordResetExpires ||
    user.passwordResetExpires < new Date()
  ) {
    throw new AppError(400, 'Invalid or expired reset code.');
  }

  const isCodeValid = await bcrypt.compare(payload.code, user.passwordResetCode);

  if (!isCodeValid) {
    throw new AppError(400, 'Invalid or expired reset code.');
  }

  // Code is valid. Issue a short-lived token to be used on the reset password screen.
  // We use the current password hash as part of the secret so the token becomes invalid
  // immediately after the password is changed.
  const secret = config.jwt.resetSecret + user.password;
  
  const resetToken = jwt.sign(
    { userId: user.id, email: user.email },
    secret,
    { expiresIn: config.jwt.resetExpiresIn }
  );

  return { resetToken };
};

const resetPassword = async (payload: IResetPasswordPayload): Promise<void> => {
  // Decode without verifying first to get the email/userId
  const decoded = jwt.decode(payload.token) as { userId?: string; email?: string } | null;

  if (!decoded || !decoded.userId) {
    throw new AppError(400, 'Invalid reset token.');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    throw new AppError(400, 'Invalid reset token.');
  }

  const secret = config.jwt.resetSecret + user.password;

  try {
    jwt.verify(payload.token, secret);
  } catch (error) {
    throw new AppError(400, 'Invalid or expired reset token.');
  }

  // Token is valid. Hash the new password and clear the reset fields.
  const hashedPassword = await bcrypt.hash(payload.newPassword, config.bcryptSaltRounds);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetCode: null,
      passwordResetExpires: null
    }
  });
};

export const AuthService = {
  register,
  login,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword
};
