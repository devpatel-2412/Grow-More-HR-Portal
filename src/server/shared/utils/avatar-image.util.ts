import sharp, { type Metadata } from 'sharp';
import { BadRequestError } from '../errors/app-error.js';

export const AVATAR_OUTPUT_SIZE = 512;
const ALLOWED_DECODED_FORMATS = new Set(['jpeg', 'png', 'webp']);
// Guards against a small-but-decompresses-huge input (a "pixel flood") eating memory/CPU during
// resize — well above any real camera/phone photo, far below what a crafted file could claim.
const MAX_INPUT_PIXELS = 40_000_000;

export interface ProcessedAvatar {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

/**
 * Authoritative, content-based image validation + normalization for profile pictures.
 *
 * multer's fileFilter (avatar-upload.middleware.ts) only checks what the client *claims* the file
 * is (declared Content-Type + original filename extension) — both are attacker-controlled and
 * easy to spoof. This actually decodes the bytes with sharp and reads back the format sharp itself
 * detected from the file's real content, so a renamed/mislabeled file (an .svg or arbitrary binary
 * saved as "photo.jpg" with a forged image/jpeg part) fails here even if it slipped past that filter.
 *
 * Every accepted avatar is normalized to the same square, size-capped, EXIF-stripped WEBP output —
 * a consistent format across the app regardless of what was uploaded, and no risk of the original
 * (unprocessed) bytes ever reaching storage.
 */
export async function processAvatarImage(buffer: Buffer): Promise<ProcessedAvatar> {
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new BadRequestError('The uploaded file is not a valid image.');
  }

  if (!metadata.format || !ALLOWED_DECODED_FORMATS.has(metadata.format)) {
    throw new BadRequestError('Only JPG, PNG, and WEBP images are allowed.');
  }
  if (!metadata.width || !metadata.height) {
    throw new BadRequestError('The uploaded file is not a valid image.');
  }
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new BadRequestError('Image dimensions are too large.');
  }

  const outputBuffer = await sharp(buffer)
    .rotate() // auto-orient from EXIF before cropping, then the pipeline below strips EXIF on output
    .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, { fit: 'cover', position: 'attention' })
    .webp({ quality: 85 })
    .toBuffer();

  return { buffer: outputBuffer, mimeType: 'image/webp', fileName: 'avatar.webp' };
}
