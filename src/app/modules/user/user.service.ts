import type { DocumentStatus, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

import config from '../../config';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';
import prisma from '../../utils/prisma';
import type {
  IAdminUpdateUserPayload,
  IChangePasswordPayload,
  IChangeRolePayload,
  IUpdateProfilePayload,
  IUploadDocumentPayload,
  IUserQuery
} from './user.interface';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  profile: true,
  documents: true
} satisfies Prisma.UserSelect;

const formatUserResponse = (user: any) => {
  if (!user) return null;
  const { profile, ...rest } = user;
  return {
    ...rest,
    status: profile?.status || 'ACTIVE',
    photoUrl: profile?.photoUrl || null,
    phoneNumber: profile?.phoneNumber || null,
    address: profile?.address || null,
    idPassportNumber: profile?.idPassportNumber || null,
    emergencyContactName: profile?.emergencyContactName || null,
    emergencyContactEmail: profile?.emergencyContactEmail || null,
    emergencyContactPhone: profile?.emergencyContactPhone || null,
    emergencyContactRelation: profile?.emergencyContactRelation || null
  };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { 
      id: userId,
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    },
    select: USER_SELECT
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  return formatUserResponse(user);
};

const updateProfile = async (userId: string, payload: IUpdateProfilePayload, photoUrl?: string) => {
  const user = await prisma.user.findFirst({
    where: { 
      id: userId,
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    },
    include: { profile: true }
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  let finalPhotoUrl = user.profile?.photoUrl;

  if (photoUrl) {
    finalPhotoUrl = photoUrl;
    // Delete old photo if it exists
    if (user.profile?.photoUrl) {
      const fullPath = path.join(process.cwd(), user.profile.photoUrl);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error(`Failed to delete old photo: ${fullPath}`, err);
        }
      }
    }
  }

  const { name, ...profileData } = payload;

  if (name) {
    await prisma.user.update({
      where: { id: userId },
      data: { name }
    });
  }

  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      ...profileData,
      photoUrl: finalPhotoUrl
    },
    create: {
      userId,
      ...profileData,
      photoUrl: finalPhotoUrl
    }
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT
  });

  return formatUserResponse(updatedUser);
};

const changePassword = async (userId: string, payload: IChangePasswordPayload) => {
  const user = await prisma.user.findFirst({
    where: { 
      id: userId,
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    }
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  if (payload.currentPassword) {
    const isMatch = await bcrypt.compare(payload.currentPassword, user.password);
    if (!isMatch) {
      throw new AppError(400, 'Incorrect current password.');
    }
  }

  const newHashedPassword = await bcrypt.hash(payload.newPassword!, Number(config.bcryptSaltRounds));

  await prisma.user.update({
    where: { id: userId },
    data: { password: newHashedPassword }
  });
};

const uploadDocument = async (userId: string, payload: IUploadDocumentPayload, documentPath: string) => {
  const user = await prisma.user.findFirst({
    where: { 
      id: userId,
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    }
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  const document = await prisma.userDocument.create({
    data: {
      userId,
      type: payload.type,
      name: payload.name,
      path: documentPath
    }
  });

  return document;
};

const deleteDocument = async (userId: string, docId: string, isAdmin = false) => {
  const document = await prisma.userDocument.findUnique({
    where: { id: docId }
  });

  if (!document) {
    throw new AppError(404, 'Document not found.');
  }

  if (!isAdmin && document.userId !== userId) {
    throw new AppError(403, 'You do not have permission to delete this document.');
  }

  if (document.status === 'VERIFIED') {
    throw new AppError(400, 'Cannot delete or update a verified document. Please contact support.');
  }

  await prisma.userDocument.delete({
    where: { id: docId }
  });

  const fullPath = path.join(process.cwd(), document.path);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error(`Failed to delete document file: ${fullPath}`, err);
    }
  }
};

const updateDocumentStatus = async (docId: string, status: DocumentStatus) => {
  const document = await prisma.userDocument.findUnique({
    where: { id: docId }
  });

  if (!document) {
    throw new AppError(404, 'Document not found.');
  }

  const updatedDoc = await prisma.userDocument.update({
    where: { id: docId },
    data: { status }
  });

  return updatedDoc;
};

const getAllUsers = async (query: IUserQuery) => {
  const queryBuilder = new QueryBuilder(query)
    .search(['name', 'email']) 
    .filter()
    .sort()
    .paginate();

  const builtQuery = queryBuilder.build();
  const whereClause: Prisma.UserWhereInput = {
    ...builtQuery.where,
    OR: [
      { profile: null },
      { profile: { isDeleted: false } }
    ]
  };

  const users = await prisma.user.findMany({
    ...builtQuery,
    where: whereClause,
    select: USER_SELECT
  });

  const total = await prisma.user.count({
    where: whereClause
  });

  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    },
    data: users.map(formatUserResponse)
  };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { 
      id,
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    },
    select: USER_SELECT
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  return formatUserResponse(user);
};

const adminUpdateUser = async (id: string, payload: IAdminUpdateUserPayload) => {
  const user = await prisma.user.findFirst({
    where: { 
      id,
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    }
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  await prisma.userProfile.upsert({
    where: { userId: id },
    update: payload,
    create: {
      userId: id,
      ...payload
    }
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT
  });

  return formatUserResponse(updatedUser);
};

const changeRole = async (id: string, payload: IChangeRolePayload) => {
  const user = await prisma.user.findFirst({
    where: { 
      id,
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    }
  });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  await prisma.user.update({
    where: { id },
    data: { role: payload.role }
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT
  });

  return formatUserResponse(updatedUser);
};

const deleteUser = async (idOrIds: string | string[]) => {
  let ids: string[] = [];

  if (Array.isArray(idOrIds)) {
    ids = idOrIds;
  } else if (typeof idOrIds === 'string') {
    ids = [idOrIds];
  }

  if (ids.length === 0) {
    throw new AppError(400, 'No user ID provided.');
  }

  const existingUsers = await prisma.user.findMany({
    where: { 
      id: { in: ids },
      OR: [
        { profile: null },
        { profile: { isDeleted: false } }
      ]
    }
  });

  if (existingUsers.length === 0) {
    throw new AppError(404, 'User(s) not found.');
  }

  for (const userId of ids) {
    await prisma.userProfile.upsert({
      where: { userId },
      update: { isDeleted: true, status: 'INACTIVE' },
      create: { userId, isDeleted: true, status: 'INACTIVE' }
    });
  }
};

export const UserService = {
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
