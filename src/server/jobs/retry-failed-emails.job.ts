import { prisma } from '../db/prisma.js';
import { retryEmailLog } from '../shared/email/email.service.js';
import { logger } from '../shared/logger.js';

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

/**
 * Re-attempts FAILED EmailLog rows below the retry cap. Runs hourly (see scheduler.ts) — deliberately
 * not immediate/queued, since the failures this catches are typically transient provider issues
 * (rate limits, brief outages) that resolve within the hour, not something a user is blocked
 * waiting on (the original business action already succeeded — see email.service.ts).
 */
export async function runRetryFailedEmails(): Promise<{ attempted: number; recovered: number }> {
  const failed = await prisma.emailLog.findMany({
    where: { status: 'FAILED', retryCount: { lt: MAX_RETRIES } },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  let recovered = 0;
  for (const log of failed) {
    await retryEmailLog(log);
    const updated = await prisma.emailLog.findUnique({ where: { id: log.id }, select: { status: true } });
    if (updated?.status === 'SENT') recovered++;
  }

  logger.info({ attempted: failed.length, recovered }, 'Retry failed emails complete');
  return { attempted: failed.length, recovered };
}
