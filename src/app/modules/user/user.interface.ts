import type { DocumentStatus, DocumentType, UserStatus } from '@prisma/client';
import type { UserRole } from '../../interfaces/auth.interface';

export interface IChangeRolePayload {
  role: UserRole;
}

export interface IUpdateProfilePayload {
  name?: string;
  phoneNumber?: string;
  address?: string;
  idPassportNumber?: string;
  emergencyContactName?: string;
  emergencyContactEmail?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export interface IChangePasswordPayload {
  currentPassword?: string; // Sometimes required, sometimes not
  newPassword?: string;
}

export interface IUploadDocumentPayload {
  type: DocumentType;
  name?: string;
}

export interface IAdminUpdateUserPayload {
  status?: UserStatus;
  notes?: string;
}

export interface IUserQuery {
  searchTerm?: string;
  status?: UserStatus;
  role?: UserRole;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
