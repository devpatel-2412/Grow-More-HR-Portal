import { prisma } from '../db/prisma.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { logger } from '../shared/logger.js';

/**
 * Once a day, notifies each tenant's Admins/HR Managers about any employee whose birthday is
 * today — a push-based companion to the "upcoming birthdays" widget on the admin KPI dashboard,
 * which only surfaces the same data passively when someone happens to look.
 */
export async function runBirthdayDigest(now: Date = new Date()): Promise<{ notified: number }> {
  const employees = await prisma.employeeProfile.findMany({
    where: { status: 'ACTIVE', dateOfBirth: { not: null } },
    select: { tenantId: true, firstName: true, lastName: true, dateOfBirth: true },
  });

  const todaysBirthdays = employees.filter(
    (e) => e.dateOfBirth!.getMonth() === now.getMonth() && e.dateOfBirth!.getDate() === now.getDate(),
  );

  let notified = 0;
  for (const employee of todaysBirthdays) {
    const recipients = await prisma.user.findMany({
      where: { tenantId: employee.tenantId, role: { in: ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'] }, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const recipient of recipients) {
      await notificationService.notify({
        tenantId: employee.tenantId,
        userId: recipient.id,
        type: 'GENERIC',
        title: "Today's birthday",
        body: `It's ${employee.firstName} ${employee.lastName}'s birthday today.`,
        link: '/',
      });
      notified++;
    }
  }

  logger.info({ birthdaysToday: todaysBirthdays.length, notified }, 'Birthday digest complete');
  return { notified };
}
