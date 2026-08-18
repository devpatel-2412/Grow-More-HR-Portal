import { storageService } from '../storage/storage.service.js';
import { logger } from '../logger.js';

// Long enough that a normal page view (list, header, session) never sees the URL expire mid-session,
// short enough to stay well within "never a long-lived or public bucket URL" (see
// supabase-storage.service.ts).
const AVATAR_URL_TTL_SECONDS = 60 * 60;

// Every signed-URL provider mints a *different* URL (fresh signature/timestamp) each time it's
// called, even for the same object — so naively re-signing on every API response gives the same
// avatar a new URL on every request, which defeats the browser's HTTP cache entirely: the exact
// same image bytes get re-downloaded on every page, every list re-render, every avatar occurrence.
// This process-local cache makes repeated resolutions of the same storage key within a window
// return the identical URL, so a browser that already has that URL cached never re-fetches the
// image. Cached well short of the signed URL's own TTL so a served URL is never close to expiring.
const URL_CACHE_TTL_MS = 15 * 60 * 1000;
const urlCache = new Map<string, { url: string; cachedAtMs: number }>();

function getCached(storageKey: string): string | null {
  const entry = urlCache.get(storageKey);
  if (!entry) return null;
  if (Date.now() - entry.cachedAtMs > URL_CACHE_TTL_MS) {
    urlCache.delete(storageKey);
    return null;
  }
  return entry.url;
}

/** Never throws — a storage hiccup or a since-deleted object must not break the whole response that
 * happens to include this user's avatar; the client falls back to initials when the field is null. */
export async function resolveAvatarUrl(avatarStorageKey: string | null | undefined): Promise<string | null> {
  if (!avatarStorageKey) return null;

  const cached = getCached(avatarStorageKey);
  if (cached) return cached;

  try {
    const url = await storageService.getSignedDownloadUrl(avatarStorageKey, AVATAR_URL_TTL_SECONDS);
    urlCache.set(avatarStorageKey, { url, cachedAtMs: Date.now() });
    return url;
  } catch (err) {
    logger.warn({ err, avatarStorageKey }, 'Failed to resolve avatar signed URL');
    return null;
  }
}

/** Called after a storage key changes (new upload, removal) so a stale cached URL for the *old*
 * key is never handed out again — the key itself is now either replaced or gone. */
export function invalidateAvatarUrlCache(avatarStorageKey: string | null | undefined): void {
  if (avatarStorageKey) urlCache.delete(avatarStorageKey);
}
