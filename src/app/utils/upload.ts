import fs from 'fs';
import multer from 'multer';
import path from 'path';

// File filter (optional but recommended)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and PDF are allowed.'));
  }
};

/**
 * Creates a multer upload instance that saves files to a specific folder inside 'uploads'
 * @param folderName The name of the folder (e.g., 'vehicles', 'drivers')
 */
export const createUploader = (folderName: string) => {
  // Use memory storage for Vercel deployment temporarily to avoid EROFS error
  const storage = multer.memoryStorage();

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit per file
    }
  });
};
