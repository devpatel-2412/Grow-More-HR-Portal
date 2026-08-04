import { prisma } from '../db/prisma.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { logger } from '../shared/logger.js';

const REMINDER_WINDOW_DAYS = 7;

/**
 * Notifies a document's uploader once it's within REMINDER_WINDOW_DAYS of expiring. Runs daily,
 * so the same document can fire more than once inside the window — deliberately simple (no
 * "already reminded" flag) rather than adding a new column purely to dedupe a once-a-day nudge.
 */
export async function runDocumentExpiryCheck(now: Date = new Date()): Promise<{ notified: number }> {
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 86_400_000);

  const expiring = await prisma.secureDocument.findMany({
    where: { archived: false, expiresAt: { gte: now, lte: windowEnd } },
    select: { id: true, tenantId: true, name: true, expiresAt: true, uploadedBy: { select: { userId: true } } },
  });

  let notified = 0;
  for (const document of expiring) {
    if (!document.uploadedBy) continue;
    const daysLeft = Math.ceil((document.expiresAt!.getTime() - now.getTime()) / 86_400_000);
    await notificationService.notify({
      tenantId: document.tenantId,
      userId: document.uploadedBy.userId,
      type: 'DOCUMENT_EXPIRING',
      title: 'Document expiring soon',
      body: `"${document.name}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
      link: '/documents',
    });
    notified++;
  }

  logger.info({ checked: expiring.length, notified }, 'Document expiry check complete');
  return { notified };
}
