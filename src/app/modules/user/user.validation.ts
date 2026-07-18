import { z } from 'zod';
import { DocumentStatus, DocumentType, UserStatus } from '@prisma/client';

const changeRole = z.object({
  body: z
    .object({
      role: z.enum(['USER', 'ADMIN'], {
        message: 'Invalid role. Must be USER or ADMIN.'
      })
    })
    .strict()
});

const updateProfile = z.object({
  body: z.object({
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    idPassportNumber: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactEmail: z.string().email('Invalid emergency contact email').optional().or(z.literal('')),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelation: z.string().optional()
  })
});

const changePassword = z.object({
  body: z.object({
    currentPassword: z.string().min(6).optional(),
    newPassword: z.string().min(6)
  })
});

const uploadDocument = z.object({
  body: z.object({
    type: z.nativeEnum(DocumentType),
    name: z.string().optional()
  })
});

const adminUpdateUser = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus).optional(),
    notes: z.string().optional()
  })
});

const updateDocumentStatus = z.object({
  body: z.object({
    status: z.nativeEnum(DocumentStatus)
  })
});

export const UserValidation = {
  changeRole,
  updateProfile,
  changePassword,
  uploadDocument,
  adminUpdateUser,
  updateDocumentStatus
};
