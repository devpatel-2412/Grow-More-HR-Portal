export interface UploadedFileInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface StorageService {
  /** Stores the file under a generated, tenant-namespaced key and returns that key plus its size in bytes. */
  upload(tenantId: string, category: string | undefined, file: UploadedFileInput): Promise<{ storageKey: string; fileSize: number }>;
  /** A fresh, short-lived signed URL for one download — never a long-lived or public bucket URL. */
  getSignedDownloadUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
  delete(storageKey: string): Promise<void>;
}

/** Namespaces every object under `<tenantId>/<category>/<uuid>-<sanitized-file-name>` so keys
 * can never collide across tenants and the original file name survives for display purposes. */
export function buildStorageKey(tenantId: string, category: string | undefined, fileName: string, uuid: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-150);
  const safeCategory = (category || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${tenantId}/${safeCategory}/${uuid}-${safeName}`;
}
