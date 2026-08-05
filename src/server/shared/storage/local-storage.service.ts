import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env, isProduction } from '../config/env.js';
import { buildStorageKey, type StorageService, type UploadedFileInput } from './storage.types.js';

const ROOT = path.resolve(process.cwd(), '.local-storage');
const DEFAULT_TTL_SECONDS = 300;

function sign(storageKey: string, expiresAt: number): string {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${storageKey}:${expiresAt}`).digest('hex');
}

/** Verifies a signature minted by LocalStorageService.getSignedDownloadUrl — used by the
 * matching download route. Kept alongside the service since both sides must agree on the
 * exact signing scheme. */
export function verifyLocalStorageSignature(storageKey: string, expiresAtRaw: string, signature: string): boolean {
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return sign(storageKey, expiresAt) === signature;
}

export function resolveLocalStoragePath(storageKey: string): string {
  return path.join(ROOT, storageKey);
}

/**
 * Development-only fallback used when Supabase Storage isn't configured — writes to a
 * gitignored folder on disk and emulates a "signed URL" with an HMAC-signed, time-limited
 * token verified by a dedicated route (local-storage.routes.ts). Mirrors ConsoleEmailService's
 * pattern: works transparently for local dev, but refuses outright in production so a missing
 * Supabase configuration fails loudly instead of silently writing uploads to an ephemeral disk.
 */
export class LocalStorageService implements StorageService {
  async upload(tenantId: string, category: string | undefined, file: UploadedFileInput) {
    if (isProduction) {
      throw new Error('No production StorageService is configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before deploying.');
    }
    const storageKey = buildStorageKey(tenantId, category, file.fileName, randomUUID());
    const fullPath = resolveLocalStoragePath(storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);
    return { storageKey, fileSize: file.buffer.length };
  }

  async getSignedDownloadUrl(storageKey: string, expiresInSeconds = DEFAULT_TTL_SECONDS) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const signature = sign(storageKey, expiresAt);
    return `/api/v1/local-storage/${encodeURIComponent(storageKey)}?expires=${expiresAt}&signature=${signature}`;
  }

  async delete(storageKey: string) {
    await unlink(resolveLocalStoragePath(storageKey)).catch(() => {
      // Already gone — deleting a document whose file was manually removed shouldn't fail the request.
    });
  }
}
