import multer from 'multer';
import { BadRequestError } from '../errors/app-error.js';

/** Every format the document system is expected to accept, per the product spec. */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
]);

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — generous for documents/images, still bounded
export const MAX_UPLOAD_FILE_COUNT = 10;

/** Buffers files in memory (never touches local disk) so the exact same multer output feeds
 * either StorageService implementation identically. Fine at this size limit; a true streaming
 * upload path would only matter for far larger files than this system is meant to hold. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, files: MAX_UPLOAD_FILE_COUNT },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestError(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    callback(null, true);
  },
});
