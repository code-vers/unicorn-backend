import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import multer from 'multer';
import path from 'node:path';

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

const createFileFilter = (folderName: string) => {
  const allowedMimeTypes =
    folderName === 'documents'
      ? ['image/jpeg', 'image/png', 'application/pdf']
      : ['image/jpeg', 'image/png', 'image/webp'];

  return (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type for this upload.'));
  };
};

/**
 * Creates a multer upload instance that saves files to a specific folder inside 'uploads'
 * @param folderName The name of the folder (e.g., 'vehicles', 'drivers')
 */
export const createUploader = (folderName: string) => {
  const uploadDirectory = path.resolve(process.cwd(), 'uploads', folderName);
  fs.mkdirSync(uploadDirectory, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => {
      const extension = extensionByMimeType[file.mimetype];
      if (!extension) {
        callback(new Error('Invalid file type for this upload.'), '');
        return;
      }
      callback(null, `${randomUUID()}${extension}`);
    }
  });

  return multer({
    storage,
    fileFilter: createFileFilter(folderName),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit per file
    }
  });
};
