/** Mirrors the server's allow-list in upload.middleware.ts — client-side check is UX only,
 * the server independently re-validates and is the real gate. */
export const DOCUMENT_ACCEPT =
  '.pdf,.docx,.xlsx,.pptx,.zip,.png,.jpg,.jpeg,.webp,.svg,.mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,image/png,image/jpeg,image/webp,image/svg+xml,video/mp4';

/** Mirrors MAX_UPLOAD_FILE_SIZE_BYTES in upload.middleware.ts. */
export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024;
