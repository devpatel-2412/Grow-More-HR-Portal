import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBirthdayDigest } from './birthday-digest.job.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { prisma } from '../db/prisma.js';

vi.mock('../db/prisma.js', () => ({
  prisma: { employeeProfile: { findMany: vi.fn() }, user: { findMany: vi.fn() } },
}));
vi.mock('../modules/notifications/notification.service.js', () => ({ notificationService: { notify: vi.fn().mockResolvedValue(undefined) } }));

const findEmployees = vi.mocked(prisma.employeeProfile.findMany);
const findUsers = vi.mocked(prisma.user.findMany);
const notify = vi.mocked(notificationService.notify);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runBirthdayDigest', () => {
  it("notifies every ADMIN/SUPER_ADMIN/HR_MANAGER in the employee's tenant when today matches their birthday (any birth year)", async () => {
    const today = new Date(2026, 5, 15); // June 15, 2026
    findEmployees.mockResolvedValue([
      { tenantId: 'tenant-1', firstName: 'Wanda', lastName: 'Worker', dateOfBirth: new Date(1990, 5, 15) },
    ] as never);
    findUsers.mockResolvedValue([{ id: 'admin-1' }, { id: 'hr-1' }] as never);

    const result = await runBirthdayDigest(today);

    expect(findUsers).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1', role: { in: ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'] }, status: 'ACTIVE' } }),
    );
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin-1', type: 'GENERIC', body: expect.stringContaining('Wanda Worker') }),
    );
    expect(result.notified).toBe(2);
  });

  it('ignores an employee whose birthday is not today', async () => {
    const today = new Date(2026, 5, 15);
    findEmployees.mockResolvedValue([
      { tenantId: 'tenant-1', firstName: 'Someone', lastName: 'Else', dateOfBirth: new Date(1990, 5, 16) },
    ] as never);

    const result = await runBirthdayDigest(today);

    expect(findUsers).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it('does not cross-notify a different tenant\'s admins', async () => {
    const today = new Date(2026, 5, 15);
    findEmployees.mockResolvedValue([
      { tenantId: 'tenant-1', firstName: 'Wanda', lastName: 'Worker', dateOfBirth: new Date(1990, 5, 15) },
      { tenantId: 'tenant-2', firstName: 'Other', lastName: 'Person', dateOfBirth: new Date(1985, 5, 15) },
    ] as never);
    findUsers.mockResolvedValueOnce([{ id: 'admin-1' }] as never).mockResolvedValueOnce([{ id: 'admin-2' }] as never);

    await runBirthdayDigest(today);

    expect(findUsers).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) }));
    expect(findUsers).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-2' }) }));
  });
});
