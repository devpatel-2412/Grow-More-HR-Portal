import multer, { MulterError } from 'multer';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../errors/app-error.js';

const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_AVATAR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Separate from the generic document-upload multer instance (upload.middleware.ts) — that one
// accepts a much broader set of formats (SVG, PDF, video, ...) and a 25MB ceiling that don't apply
// to a profile picture. Checks both the declared MIME type and the filename extension (neither is
// trustworthy alone — see processAvatarImage in avatar-image.util.ts for the real, content-based
// check that actually decides what gets stored).
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_FILE_SIZE_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype) || !ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
      callback(new BadRequestError('Only JPG, PNG, and WEBP images are allowed.'));
      return;
    }
    callback(null, true);
  },
});

/** Wraps multer's callback-style error so a too-large avatar gets the exact copy the product spec
 * calls for, instead of the generic "File is too large." shared by every other upload endpoint. */
export function avatarUploadSingle(req: Request, res: Response, next: NextFunction): void {
  avatarUpload.single('avatar')(req, res, (err: unknown) => {
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new BadRequestError('Profile picture must be smaller than 5 MB.'));
      return;
    }
    next(err);
  });
}
