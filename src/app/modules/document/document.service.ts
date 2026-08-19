import prisma from '../../utils/prisma';
import { DocumentStatus, DocumentType } from '@prisma/client';
import AppError from '../../errors/AppError';
import { stat, unlink } from 'node:fs/promises';
import path from 'node:path';

export interface IDocumentPayload {
  userId: string;
  type: DocumentType;
  name?: string;
  status?: DocumentStatus;
}

const uploadDocument = async (payload: IDocumentPayload, fileUrl: string) => {
  const { document, previousPath } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document:${payload.userId}:${payload.type}`}))`;

    const existingDocument = await tx.userDocument.findFirst({
      where: { userId: payload.userId, type: payload.type },
      orderBy: { createdAt: 'desc' }
    });
    const data = {
      name: payload.name || payload.type.toString(),
      path: fileUrl,
      status: payload.status || DocumentStatus.PENDING_REVIEW
    };

    if (existingDocument) {
      const updatedDocument = await tx.userDocument.update({
        where: { id: existingDocument.id },
        data,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      return { document: updatedDocument, previousPath: existingDocument.path };
    }

    const createdDocument = await tx.userDocument.create({
      data: { ...data, userId: payload.userId, type: payload.type },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    return { document: createdDocument, previousPath: null as string | null };
  });

  if (previousPath?.startsWith('/uploads/documents/')) {
    const previousFileName = path.basename(previousPath);
    if (previousFileName && previousFileName !== 'undefined' && previousFileName !== 'null') {
      const previousFilePath = path.resolve(
        process.cwd(),
        'uploads',
        'documents',
        previousFileName
      );
      await unlink(previousFilePath).catch(() => undefined);
    }
  }

  return document;
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

const getDocumentForUser = async (id: string, userId: string, isAdmin: boolean) => {
  const document = await prisma.userDocument.findUnique({ where: { id } });
  if (!document || (!isAdmin && document.userId !== userId)) {
    throw new AppError(404, 'Document not found');
  }
  return document;
};

const getDocumentFileForUser = async (id: string, userId: string, isAdmin: boolean) => {
  const document = await getDocumentForUser(id, userId, isAdmin);
  const documentsDirectory = path.resolve(process.cwd(), 'uploads', 'documents');
  const fileName = path.basename(document.path);

  if (
    !document.path.startsWith('/uploads/documents/') ||
    !fileName ||
    fileName === 'undefined' ||
    fileName === 'null'
  ) {
    throw new AppError(410, 'This document file is no longer available. Please upload it again.');
  }

  const filePath = path.resolve(documentsDirectory, fileName);
  if (path.dirname(filePath) !== documentsDirectory) {
    throw new AppError(400, 'Invalid document path.');
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error('Document path does not point to a file.');
    }
  } catch {
    throw new AppError(410, 'This document file is no longer available. Please upload it again.');
  }

  return { document, filePath };
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

  const deletedDocument = await prisma.userDocument.delete({
    where: { id }
  });
  const filePath = path.resolve(
    process.cwd(),
    'uploads',
    'documents',
    path.basename(document.path)
  );
  await unlink(filePath).catch(() => undefined);
  return deletedDocument;
};

export const DocumentService = {
  uploadDocument,
  getAllDocuments,
  getDocumentsByUserId,
  getDocumentForUser,
  getDocumentFileForUser,
  updateDocumentStatus,
  deleteDocument
};
