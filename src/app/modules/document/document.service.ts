import prisma from '../../utils/prisma';
import { DocumentStatus, DocumentType } from '@prisma/client';
import AppError from '../../errors/AppError';

export interface IDocumentPayload {
  userId: string;
  type: DocumentType;
  name?: string;
  status?: DocumentStatus;
}

const uploadDocument = async (payload: IDocumentPayload, fileUrl: string) => {
  return prisma.userDocument.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      name: payload.name || payload.type.toString(),
      path: fileUrl,
      status: payload.status || DocumentStatus.PENDING_REVIEW,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
};

const getAllDocuments = async () => {
  return prisma.userDocument.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

const getDocumentsByUserId = async (userId: string) => {
  return prisma.userDocument.findMany({
    where: { userId },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

const updateDocumentStatus = async (id: string, status: DocumentStatus) => {
  const document = await prisma.userDocument.findUnique({ where: { id } });
  if (!document) {
    throw new AppError(404, 'Document not found');
  }

  return prisma.userDocument.update({
    where: { id },
    data: { status },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
};

const deleteDocument = async (id: string) => {
  const document = await prisma.userDocument.findUnique({ where: { id } });
  if (!document) {
    throw new AppError(404, 'Document not found');
  }

  return prisma.userDocument.delete({
    where: { id }
  });
};

export const DocumentService = {
  uploadDocument,
  getAllDocuments,
  getDocumentsByUserId,
  updateDocumentStatus,
  deleteDocument
};
