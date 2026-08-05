import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { buildStorageKey, type StorageService, type UploadedFileInput } from './storage.types.js';

const DEFAULT_TTL_SECONDS = 300;

/** Real production storage — a private Supabase Storage bucket. Every download goes through
 * `getSignedDownloadUrl`, which mints a fresh time-limited URL per request; the bucket itself
 * is never made public, so a leaked object key alone can't be used to fetch the file. */
export class SupabaseStorageService implements StorageService {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor() {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    this.bucket = env.SUPABASE_STORAGE_BUCKET;
  }

  async upload(tenantId: string, category: string | undefined, file: UploadedFileInput) {
    const storageKey = buildStorageKey(tenantId, category, file.fileName, randomUUID());
    const { error } = await this.client.storage.from(this.bucket).upload(storageKey, file.buffer, {
      contentType: file.mimeType,
      upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return { storageKey, fileSize: file.buffer.length };
  }

  async getSignedDownloadUrl(storageKey: string, expiresInSeconds = DEFAULT_TTL_SECONDS) {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(storageKey, expiresInSeconds);
    if (error || !data) throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown error'}`);
    return data.signedUrl;
  }

  async delete(storageKey: string) {
    const { error } = await this.client.storage.from(this.bucket).remove([storageKey]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }
}
