import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bootstrapSuperAdmin } from './bootstrap-super-admin.js';

const { prismaMock, auditRecord, envMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn(),
  },
  auditRecord: vi.fn().mockResolvedValue(undefined),
  envMock: { BOOTSTRAP_SUPER_ADMIN_EMAIL: 'owner@platform.com', BOOTSTRAP_SUPER_ADMIN_PASSWORD: 'CorrectPassword123' },
}));
vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../modules/audit/audit.service.js', () => ({ auditLogService: { record: auditRecord } }));
vi.mock('../shared/config/env.js', () => ({ env: envMock, isProduction: false }));

function makeTx() {
  return {
    tenant: { upsert: vi.fn().mockResolvedValue({ id: 'tenant-platform' }) },
    user: { create: vi.fn().mockResolvedValue({ id: 'user-super-admin' }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.user.findUnique.mockResolvedValue(null);
  envMock.BOOTSTRAP_SUPER_ADMIN_EMAIL = 'owner@platform.com';
  envMock.BOOTSTRAP_SUPER_ADMIN_PASSWORD = 'CorrectPassword123';
  prismaMock.$transaction.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => fn(makeTx()));
});

describe('bootstrapSuperAdmin', () => {
  it('creates exactly one SUPER_ADMIN when none exists and env vars are set', async () => {
    await bootstrapSuperAdmin();

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUPER_ADMIN_BOOTSTRAPPED', targetType: 'User', targetId: 'user-super-admin' }),
    );
  });

  it('is a no-op when a SUPER_ADMIN already exists', async () => {
    prismaMock.user.count.mockResolvedValue(1);

    await bootstrapSuperAdmin();

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it('is a no-op and does not throw when the bootstrap env vars are unset', async () => {
    envMock.BOOTSTRAP_SUPER_ADMIN_EMAIL = '';
    envMock.BOOTSTRAP_SUPER_ADMIN_PASSWORD = '';

    await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('skips bootstrap without throwing when the bootstrap email already belongs to a non-SUPER_ADMIN account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-user', role: 'ADMIN' });

    await bootstrapSuperAdmin();

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it('never throws, even if the transaction itself fails', async () => {
    prismaMock.$transaction.mockRejectedValue(new Error('db unreachable'));

    await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
  });
});
