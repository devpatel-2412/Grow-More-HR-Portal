import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage/storage.service.js', () => ({
  storageService: { getSignedDownloadUrl: vi.fn() },
}));

import { storageService } from '../storage/storage.service.js';
import { resolveAvatarUrl, invalidateAvatarUrlCache } from './avatar-url.util.js';

const getSignedDownloadUrl = vi.mocked(storageService.getSignedDownloadUrl);

// The module under test keeps its URL cache at module scope (that's the whole point — it survives
// across requests within the process), so each test uses its own unique storage keys below to
// avoid one test's cached entry leaking into another's assertions.
let testRun = 0;
function uniqueKey(name: string): string {
  testRun += 1;
  return `tenant-1/avatars/${name}-${testRun}.webp`;
}

describe('resolveAvatarUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Every provider mints a fresh, different signature per call by design — simulate that here
    // so a passing test actually proves the *caching* layer is what keeps the URL stable, not an
    // accidentally-deterministic mock.
    let calls = 0;
    getSignedDownloadUrl.mockImplementation((key: string) => Promise.resolve(`https://signed.example/${key}?sig=${++calls}`));
  });

  it('returns null without calling storage when there is no storage key', async () => {
    expect(await resolveAvatarUrl(null)).toBeNull();
    expect(await resolveAvatarUrl(undefined)).toBeNull();
    expect(getSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('returns the same URL for repeated resolutions of the same key, so the browser can cache the image (only one real sign call)', async () => {
    const key = uniqueKey('repeat');
    const first = await resolveAvatarUrl(key);
    const second = await resolveAvatarUrl(key);
    const third = await resolveAvatarUrl(key);

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(getSignedDownloadUrl).toHaveBeenCalledOnce();
  });

  it('mints independent URLs for different keys', async () => {
    const a = await resolveAvatarUrl(uniqueKey('a'));
    const b = await resolveAvatarUrl(uniqueKey('b'));
    expect(a).not.toBe(b);
    expect(getSignedDownloadUrl).toHaveBeenCalledTimes(2);
  });

  it('re-signs after the cached entry is explicitly invalidated (e.g. avatar replaced/removed)', async () => {
    const key = uniqueKey('invalidate');
    const first = await resolveAvatarUrl(key);
    invalidateAvatarUrlCache(key);
    const second = await resolveAvatarUrl(key);

    expect(second).not.toBe(first);
    expect(getSignedDownloadUrl).toHaveBeenCalledTimes(2);
  });

  it('returns null (never throws) when the storage provider fails', async () => {
    getSignedDownloadUrl.mockRejectedValueOnce(new Error('bucket unreachable'));
    expect(await resolveAvatarUrl(uniqueKey('failing'))).toBeNull();
  });
});
