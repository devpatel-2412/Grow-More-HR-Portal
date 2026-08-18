import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
vi.mock('../../shared/utils/avatar-image.util.js', () => ({
  processAvatarImage: vi.fn().mockResolvedValue({ buffer: Buffer.from('processed'), mimeType: 'image/webp', fileName: 'avatar.webp' }),
}));
vi.mock('../../shared/storage/storage.service.js', () => ({
  storageService: {
    upload: vi.fn().mockResolvedValue({ storageKey: 'tenant-1/avatars/new-key.webp', fileSize: 9 }),
    getSignedDownloadUrl: vi.fn().mockImplementation((key: string) => Promise.resolve(`https://signed.example/${key}`)),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

import { auditLogService } from '../audit/audit.service.js';
import { processAvatarImage } from '../../shared/utils/avatar-image.util.js';
import { storageService } from '../../shared/storage/storage.service.js';

function makeDeps(userOverrides: Partial<Record<string, unknown>> = {}) {
  const user = { id: 'user-1', tenantId: 'tenant-1', email: 'ada@acme.com', avatarStorageKey: null, ...userOverrides };
  const repository = {
    findById: vi.fn().mockResolvedValue(user),
    update: vi.fn().mockImplementation((_id, data) => Promise.resolve({ ...user, ...data })),
  };
  return { repository, user };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new UserService(deps.repository as never, {} as never, {} as never, {} as never);
}

const fakeFile = { buffer: Buffer.from('raw-upload-bytes'), mimeType: 'image/jpeg', fileName: 'photo.jpg' };

describe('UserService.updateAvatar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('processes the upload, stores it, and updates the user with the new storage key', async () => {
    const deps = makeDeps();
    const result = await build(deps).updateAvatar('tenant-1', 'user-1', fakeFile, { actorUserId: 'user-1' });

    expect(processAvatarImage).toHaveBeenCalledWith(fakeFile.buffer);
    expect(storageService.upload).toHaveBeenCalledWith('tenant-1', 'avatars', expect.objectContaining({ mimeType: 'image/webp' }));
    expect(deps.repository.update).toHaveBeenCalledWith('user-1', { avatarStorageKey: 'tenant-1/avatars/new-key.webp' });
    expect(result.avatarUrl).toBe('https://signed.example/tenant-1/avatars/new-key.webp');
  });

  it('deletes the previous avatar file after a successful replace, not before', async () => {
    const deps = makeDeps({ avatarStorageKey: 'tenant-1/avatars/old-key.webp' });
    await build(deps).updateAvatar('tenant-1', 'user-1', fakeFile, {});
    expect(storageService.delete).toHaveBeenCalledWith('tenant-1/avatars/old-key.webp');
  });

  it('does not attempt to delete anything when the user had no previous avatar', async () => {
    const deps = makeDeps({ avatarStorageKey: null });
    await build(deps).updateAvatar('tenant-1', 'user-1', fakeFile, {});
    expect(storageService.delete).not.toHaveBeenCalled();
  });

  it('records a USER_AVATAR_UPDATED audit entry', async () => {
    const deps = makeDeps();
    await build(deps).updateAvatar('tenant-1', 'user-1', fakeFile, { actorUserId: 'user-1' });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_AVATAR_UPDATED', targetId: 'user-1' }));
  });

  it('rejects (via the existing tenant-scoped getById) an attempt to set an avatar on a user from a different tenant', async () => {
    const deps = makeDeps({ tenantId: 'other-tenant' });
    await expect(build(deps).updateAvatar('tenant-1', 'user-1', fakeFile, {})).rejects.toThrow(/not found/i);
    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('propagates a content-validation rejection (e.g. a spoofed non-image file) without storing anything', async () => {
    const deps = makeDeps();
    vi.mocked(processAvatarImage).mockRejectedValueOnce(new Error('The uploaded file is not a valid image.'));
    await expect(build(deps).updateAvatar('tenant-1', 'user-1', fakeFile, {})).rejects.toThrow(/not a valid image/i);
    expect(storageService.upload).not.toHaveBeenCalled();
    expect(deps.repository.update).not.toHaveBeenCalled();
  });
});

describe('UserService.removeAvatar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears the stored key and deletes the file when an avatar exists', async () => {
    const deps = makeDeps({ avatarStorageKey: 'tenant-1/avatars/old-key.webp' });
    const result = await build(deps).removeAvatar('tenant-1', 'user-1', { actorUserId: 'user-1' });

    expect(deps.repository.update).toHaveBeenCalledWith('user-1', { avatarStorageKey: null });
    expect(storageService.delete).toHaveBeenCalledWith('tenant-1/avatars/old-key.webp');
    expect(result.avatarUrl).toBeNull();
  });

  it('is a no-op — does not touch storage or the DB row — when the user has no avatar to remove', async () => {
    const deps = makeDeps({ avatarStorageKey: null });
    await build(deps).removeAvatar('tenant-1', 'user-1', {});

    expect(deps.repository.update).not.toHaveBeenCalled();
    expect(storageService.delete).not.toHaveBeenCalled();
  });

  it('rejects removing an avatar for a user outside the caller\'s tenant', async () => {
    const deps = makeDeps({ tenantId: 'other-tenant', avatarStorageKey: 'k' });
    await expect(build(deps).removeAvatar('tenant-1', 'user-1', {})).rejects.toThrow(/not found/i);
    expect(storageService.delete).not.toHaveBeenCalled();
  });

  it('records a USER_AVATAR_REMOVED audit entry', async () => {
    const deps = makeDeps({ avatarStorageKey: 'k' });
    await build(deps).removeAvatar('tenant-1', 'user-1', { actorUserId: 'user-1' });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_AVATAR_REMOVED', targetId: 'user-1' }));
  });
});
