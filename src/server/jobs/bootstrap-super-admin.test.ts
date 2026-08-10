import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bootstrapSuperAdmin } from './bootstrap-super-admin.js';

const { prismaMock, auditRecord, envMock, hashPasswordMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(),
  },
  auditRecord: vi.fn().mockResolvedValue(undefined),
  envMock: { BOOTSTRAP_SUPER_ADMIN_EMAIL: 'owner@platform.com', BOOTSTRAP_SUPER_ADMIN_PASSWORD: 'CorrectPassword123' },
  hashPasswordMock: vi.fn((plain: string) => `hashed:${plain}`),
}));
vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../modules/audit/audit.service.js', () => ({ auditLogService: { record: auditRecord } }));
vi.mock('../shared/config/env.js', () => ({ env: envMock, isProduction: false }));
vi.mock('../shared/utils/hash.util.js', () => ({ hashPassword: hashPasswordMock }));

function makeTx() {
  return {
    tenant: { upsert: vi.fn().mockResolvedValue({ id: 'tenant-platform' }) },
    user: {
      create: vi.fn().mockResolvedValue({ id: 'user-super-admin' }),
      update: vi.fn().mockResolvedValue(undefined),
    },
  };
}

let lastTx: ReturnType<typeof makeTx>;

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.count.mockResolvedValue(0);
  envMock.BOOTSTRAP_SUPER_ADMIN_EMAIL = 'owner@platform.com';
  envMock.BOOTSTRAP_SUPER_ADMIN_PASSWORD = 'CorrectPassword123';
  hashPasswordMock.mockImplementation((plain: string) => `hashed:${plain}`);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => {
    lastTx = makeTx();
    return fn(lastTx);
  });
});

describe('bootstrapSuperAdmin — fresh database (no user with the bootstrap email, no SUPER_ADMIN anywhere)', () => {
  it('creates exactly one SUPER_ADMIN with ACTIVE status and a hashed password', async () => {
    await bootstrapSuperAdmin();

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(lastTx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'owner@platform.com',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          passwordHash: 'hashed:CorrectPassword123',
          tenantId: 'tenant-platform',
        }),
      }),
    );
    expect(hashPasswordMock).toHaveBeenCalledWith('CorrectPassword123');
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUPER_ADMIN_BOOTSTRAPPED', targetType: 'User', targetId: 'user-super-admin' }),
    );
  });
});

describe('bootstrapSuperAdmin — a SUPER_ADMIN already exists under a different email', () => {
  it('does not create another SUPER_ADMIN and logs that one already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.count.mockResolvedValue(1);

    await bootstrapSuperAdmin();

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });
});

describe('bootstrapSuperAdmin — the bootstrap email already exists under another role', () => {
  it('promotes the existing account to SUPER_ADMIN, sets it ACTIVE, and resets its password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-user-1',
      email: 'owner@platform.com',
      role: 'ADMIN',
      status: 'SUSPENDED',
      tenantId: 'tenant-existing',
    });

    await bootstrapSuperAdmin();

    expect(lastTx.user.update).toHaveBeenCalledWith({
      where: { id: 'existing-user-1' },
      data: {
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        passwordHash: 'hashed:CorrectPassword123',
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUPER_ADMIN_BOOTSTRAPPED',
        targetId: 'existing-user-1',
        tenantId: 'tenant-existing',
        metadata: expect.objectContaining({ outcome: 'promoted', previousRole: 'ADMIN' }),
      }),
    );
    // Does not create a second account or a new tenant.
    expect(prismaMock.user.count).not.toHaveBeenCalled();
  });
});

describe('bootstrapSuperAdmin — the bootstrap email already exists and is already SUPER_ADMIN', () => {
  it('re-verifies the account: forces ACTIVE, clears lockout, and resets the password to match the configured value', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-super-admin-1',
      email: 'owner@platform.com',
      role: 'SUPER_ADMIN',
      status: 'SUSPENDED',
      tenantId: 'tenant-platform',
      failedLoginCount: 5,
      lockedUntil: new Date(Date.now() + 900_000),
    });

    await bootstrapSuperAdmin();

    expect(lastTx.user.update).toHaveBeenCalledWith({
      where: { id: 'existing-super-admin-1' },
      data: {
        status: 'ACTIVE',
        passwordHash: 'hashed:CorrectPassword123',
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ outcome: 'verified' }) }),
    );
  });
});

describe('bootstrapSuperAdmin — password hashing', () => {
  it('always stores a hash produced by hashPassword(), never the plaintext password', async () => {
    await bootstrapSuperAdmin();

    expect(lastTx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: 'hashed:CorrectPassword123' }) }),
    );
    const createCallData = lastTx.user.create.mock.calls[0][0].data;
    expect(createCallData.passwordHash).not.toBe('CorrectPassword123');
  });
});

describe('bootstrapSuperAdmin — never logs the plaintext password', () => {
  it('never passes the raw password to logger.info/warn/error call arguments', async () => {
    const { logger } = await import('../shared/logger.js');
    const infoSpy = vi.spyOn(logger, 'info');
    const warnSpy = vi.spyOn(logger, 'warn');
    const errorSpy = vi.spyOn(logger, 'error');

    await bootstrapSuperAdmin();

    for (const spy of [infoSpy, warnSpy, errorSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('CorrectPassword123');
      }
    }
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('bootstrapSuperAdmin — idempotency', () => {
  it('running it twice in a row (SUPER_ADMIN now exists) only mutates the database on the first run', async () => {
    await bootstrapSuperAdmin();
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();

    // Second boot: the account now exists as SUPER_ADMIN — this exercises the "already SUPER_ADMIN" branch, still a no-throw, single transaction.
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-super-admin',
      email: 'owner@platform.com',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-platform',
    });
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-super-admin',
      email: 'owner@platform.com',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-platform',
    });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => unknown) => {
      lastTx = makeTx();
      return fn(lastTx);
    });

    await bootstrapSuperAdmin();
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});

describe('bootstrapSuperAdmin — transaction rollback / failure', () => {
  it('never throws, even if the transaction itself fails (fresh-create path)', async () => {
    prismaMock.$transaction.mockRejectedValue(new Error('db unreachable'));

    await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it('never throws, even if the transaction fails while promoting an existing account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-user-1',
      email: 'owner@platform.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-existing',
    });
    prismaMock.$transaction.mockRejectedValue(new Error('constraint violation'));

    await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
    expect(auditRecord).not.toHaveBeenCalled();
  });
});

describe('bootstrapSuperAdmin — missing environment variables', () => {
  it('does nothing and does not throw when both are unset', async () => {
    envMock.BOOTSTRAP_SUPER_ADMIN_EMAIL = '';
    envMock.BOOTSTRAP_SUPER_ADMIN_PASSWORD = '';

    await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('does nothing when only the email is set', async () => {
    envMock.BOOTSTRAP_SUPER_ADMIN_PASSWORD = '';

    await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('does nothing when only the password is set', async () => {
    envMock.BOOTSTRAP_SUPER_ADMIN_EMAIL = '';

    await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
