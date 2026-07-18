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
  // Base upload directory relative to project root
  const UPLOAD_DIR = path.join(process.cwd(), 'uploads', folderName);

  // Ensure the upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Configure Multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      // Generate unique filename to avoid overwrites
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const fileName = `${uniqueSuffix}${ext}`;
      cb(null, fileName);
    }
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit per file
    }
  });
};
