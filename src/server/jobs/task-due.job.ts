import { prisma } from '../db/prisma.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { taskOverdueEmailTemplate } from '../shared/email/email.templates.js';
import { env } from '../shared/config/env.js';
import { logger } from '../shared/logger.js';

const DUE_SOON_WINDOW_DAYS = 2;

const taskWithAssigneeSelect = {
  id: true,
  tenantId: true,
  title: true,
  dueDate: true,
  projectId: true,
  project: { select: { name: true } },
  assignedTo: { select: { userId: true, firstName: true, lastName: true, managerId: true } },
} as const;

/**
 * Notifies once per day this runs (not on page load/GET requests — nothing in the read paths
 * calls this) for tasks entering the due-soon window or newly overdue. Deliberately mirrors
 * document-expiry.job.ts's accepted tradeoff: no "already reminded" column, so a task that stays
 * overdue across multiple runs is renotified each day rather than adding a schema column purely
 * to dedupe a once-a-day nudge.
 */
export async function runTaskDueCheck(now: Date = new Date()): Promise<{ dueSoonNotified: number; overdueNotified: number }> {
  const windowEnd = new Date(now.getTime() + DUE_SOON_WINDOW_DAYS * 86_400_000);

  const dueSoonTasks = await prisma.task.findMany({
    where: { status: { not: 'DONE' }, dueDate: { gte: now, lte: windowEnd }, assignedToId: { not: null } },
    select: taskWithAssigneeSelect,
  });

  let dueSoonNotified = 0;
  for (const task of dueSoonTasks) {
    if (!task.assignedTo) continue;
    await notificationService.notify({
      tenantId: task.tenantId,
      userId: task.assignedTo.userId,
      type: 'TASK_DUE_SOON',
      title: 'Task due soon',
      body: `"${task.title}" is due soon.`,
      link: `/projects/${task.projectId}`,
      // A lighter-touch in-app nudge only — the overdue escalation below is what actually emails.
      skipEmail: true,
    });
    dueSoonNotified++;
  }

  const overdueTasks = await prisma.task.findMany({
    where: { status: { not: 'DONE' }, dueDate: { lt: now }, assignedToId: { not: null } },
    select: taskWithAssigneeSelect,
  });

  let overdueNotified = 0;
  for (const task of overdueTasks) {
    if (!task.assignedTo || !task.dueDate) continue;
    const taskLink = `/projects/${task.projectId}`;

    await notificationService.notify({
      tenantId: task.tenantId,
      userId: task.assignedTo.userId,
      type: 'TASK_OVERDUE',
      title: 'Task overdue',
      body: `"${task.title}" is overdue.`,
      link: taskLink,
      emailOverride: taskOverdueEmailTemplate({
        recipientName: task.assignedTo.firstName,
        taskTitle: task.title,
        projectName: task.project.name,
        dueDate: task.dueDate,
        taskLink,
        appUrl: env.APP_URL,
      }),
    });
    overdueNotified++;

    if (task.assignedTo.managerId) {
      const manager = await prisma.employeeProfile.findUnique({
        where: { id: task.assignedTo.managerId },
        select: { userId: true, firstName: true },
      });
      if (manager) {
        await notificationService.notify({
          tenantId: task.tenantId,
          userId: manager.userId,
          type: 'TASK_OVERDUE',
          title: 'Task overdue',
          body: `"${task.title}" (${task.assignedTo.firstName} ${task.assignedTo.lastName}) is overdue.`,
          link: taskLink,
          emailOverride: taskOverdueEmailTemplate({
            recipientName: manager.firstName,
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: task.dueDate,
            taskLink,
            appUrl: env.APP_URL,
          }),
        });
      }
    }
  }

  logger.info(
    { dueSoonChecked: dueSoonTasks.length, dueSoonNotified, overdueChecked: overdueTasks.length, overdueNotified },
    'Task due-date check complete',
  );
  return { dueSoonNotified, overdueNotified };
}
