import { env } from '../config/env.js';
import { LocalStorageService } from './local-storage.service.js';
import { SupabaseStorageService } from './supabase-storage.service.js';
import type { StorageService } from './storage.types.js';

export type { StorageService, UploadedFileInput } from './storage.types.js';

/** Swaps provider based on config alone — nothing else in the app imports LocalStorageService or
 * SupabaseStorageService directly, so adding a third provider later only touches this file. */
export const storageService: StorageService =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? new SupabaseStorageService() : new LocalStorageService();
