import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runDocumentExpiryCheck } from './document-expiry.job.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { prisma } from '../db/prisma.js';

vi.mock('../db/prisma.js', () => ({ prisma: { secureDocument: { findMany: vi.fn() } } }));
vi.mock('../modules/notifications/notification.service.js', () => ({ notificationService: { notify: vi.fn().mockResolvedValue(undefined) } }));

const findMany = vi.mocked(prisma.secureDocument.findMany);
const notify = vi.mocked(notificationService.notify);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runDocumentExpiryCheck', () => {
  it('notifies the uploader of a document expiring within the window, with days-left in the body', async () => {
    const now = new Date(2026, 0, 1);
    findMany.mockResolvedValue([
      {
        id: 'doc-1',
        tenantId: 'tenant-1',
        name: 'Vendor Contract',
        expiresAt: new Date(2026, 0, 4),
        uploadedBy: { userId: 'user-1' },
      },
    ] as never);

    const result = await runDocumentExpiryCheck(now);

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1', type: 'DOCUMENT_EXPIRING', body: expect.stringContaining('3 days') }),
    );
    expect(result.notified).toBe(1);
  });

  it('uses singular "day" for a document expiring tomorrow', async () => {
    const now = new Date(2026, 0, 1);
    findMany.mockResolvedValue([
      { id: 'doc-1', tenantId: 'tenant-1', name: 'Contract', expiresAt: new Date(2026, 0, 2), uploadedBy: { userId: 'user-1' } },
    ] as never);

    await runDocumentExpiryCheck(now);

    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining('1 day') }));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ body: expect.not.stringContaining('1 days') }));
  });

  it('skips a document with no recorded uploader — there is no one to notify', async () => {
    const now = new Date(2026, 0, 1);
    findMany.mockResolvedValue([
      { id: 'doc-1', tenantId: 'tenant-1', name: 'Orphaned doc', expiresAt: new Date(2026, 0, 3), uploadedBy: null },
    ] as never);

    const result = await runDocumentExpiryCheck(now);

    expect(notify).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it('only queries non-archived documents expiring within the reminder window', async () => {
    findMany.mockResolvedValue([]);
    const now = new Date(2026, 0, 1);

    await runDocumentExpiryCheck(now);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archived: false,
          expiresAt: { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) },
        }),
      }),
    );
  });
});
