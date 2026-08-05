import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { LocalStorageService, verifyLocalStorageSignature, resolveLocalStoragePath } from './local-storage.service.js';

const ROOT = path.resolve(process.cwd(), '.local-storage');

afterEach(async () => {
  await rm(path.join(ROOT, 'test-tenant'), { recursive: true, force: true });
});

describe('LocalStorageService', () => {
  it('writes the file under a tenant-namespaced key and reports its size', async () => {
    const service = new LocalStorageService();
    const buffer = Buffer.from('hello world');
    const { storageKey, fileSize } = await service.upload('test-tenant', 'policies', {
      buffer,
      mimeType: 'text/plain',
      fileName: 'readme.txt',
    });

    expect(storageKey).toMatch(/^test-tenant\/policies\/.+-readme\.txt$/);
    expect(fileSize).toBe(buffer.length);
  });

  it('never lets a path-traversal file name escape the storage root — slashes are stripped, so ".." in the name can\'t form a real path segment', async () => {
    const service = new LocalStorageService();
    const { storageKey } = await service.upload('test-tenant', 'general', {
      buffer: Buffer.from('x'),
      mimeType: 'text/plain',
      fileName: '../../etc/passwd',
    });

    expect(storageKey).not.toContain('/../');
    expect(resolveLocalStoragePath(storageKey).startsWith(ROOT)).toBe(true);
  });

  it('round-trips a signed download URL: fresh signature verifies, tampered key does not', async () => {
    const service = new LocalStorageService();
    const { storageKey } = await service.upload('test-tenant', 'general', {
      buffer: Buffer.from('secret'),
      mimeType: 'text/plain',
      fileName: 'file.txt',
    });
    const url = await service.getSignedDownloadUrl(storageKey);
    const params = new URL(url, 'http://localhost').searchParams;
    const expires = params.get('expires')!;
    const signature = params.get('signature')!;

    expect(verifyLocalStorageSignature(storageKey, expires, signature)).toBe(true);
    expect(verifyLocalStorageSignature('a-different-key', expires, signature)).toBe(false);
  });

  it('rejects a signature whose expiry has already passed', () => {
    const expiredAt = String(Date.now() - 1000);
    expect(verifyLocalStorageSignature('some-key', expiredAt, 'any-signature')).toBe(false);
  });

  it('delete() does not throw for a key that was never written', async () => {
    const service = new LocalStorageService();
    await expect(service.delete('test-tenant/general/never-existed.txt')).resolves.toBeUndefined();
  });
});
