import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runRetryFailedEmails } from './retry-failed-emails.job.js';

const { prismaMock, retryEmailLog } = vi.hoisted(() => ({
  prismaMock: {
    emailLog: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({ status: 'FAILED' }),
    },
  },
  retryEmailLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../shared/email/email.service.js', () => ({ retryEmailLog }));

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.emailLog.findMany.mockResolvedValue([]);
  prismaMock.emailLog.findUnique.mockResolvedValue({ status: 'FAILED' });
});

describe('runRetryFailedEmails', () => {
  it('queries only FAILED rows below the retry cap', async () => {
    await runRetryFailedEmails();
    expect(prismaMock.emailLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'FAILED', retryCount: { lt: 5 } } }),
    );
  });

  it('attempts a retry for every row found and counts recoveries', async () => {
    prismaMock.emailLog.findMany.mockResolvedValue([
      { id: 'log-1', to: 'a@acme.com', subject: 'x', html: null, text: 'x', retryCount: 1 },
      { id: 'log-2', to: 'b@acme.com', subject: 'y', html: null, text: 'y', retryCount: 2 },
    ]);
    prismaMock.emailLog.findUnique
      .mockResolvedValueOnce({ status: 'SENT' })
      .mockResolvedValueOnce({ status: 'FAILED' });

    const result = await runRetryFailedEmails();

    expect(retryEmailLog).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ attempted: 2, recovered: 1 });
  });

  it('does nothing when there are no failed rows to retry', async () => {
    const result = await runRetryFailedEmails();
    expect(retryEmailLog).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: 0, recovered: 0 });
  });
});
