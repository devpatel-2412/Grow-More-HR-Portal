import { NotificationRepository, type CreateNotificationInput } from './notification.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-error.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import { emailService } from '../../shared/email/email.service.js';
import { notificationEmailTemplate } from '../../shared/email/email.templates.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/logger.js';

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository = new NotificationRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) {}

  /**
   * The one entry point every other module should call to notify a user — mirrors
   * AuditLogService's role for the audit trail. A write failure here must never break the
   * calling request (e.g. assigning a task should succeed even if the notification insert fails).
   *
   * Also sends a real email using the same title/body/link — this is the single point that makes
   * every notify() call site (leave, tasks, tickets, ...) a real email trigger with zero changes
   * to those call sites. Email delivery failure never affects the in-app notification either way
   * (EmailService.send() itself never throws — see email.service.ts).
   */
  async notify(input: CreateNotificationInput): Promise<void> {
    try {
      await this.repository.create(input);
    } catch {
      // Deliberately swallowed — notifications are a convenience, not a system of record.
    }

    try {
      const user = await this.userRepository.findById(input.userId);
      if (!user) return;
      const { subject, html, text } = notificationEmailTemplate({
        title: input.title,
        body: input.body,
        link: input.link,
        appUrl: env.APP_URL,
      });
      await emailService.send({ to: user.email, subject, html, text, template: `notification_${input.type.toLowerCase()}`, tenantId: input.tenantId });
    } catch (err) {
      logger.error({ err, userId: input.userId, type: input.type }, 'Failed to send notification email');
    }
  }

  async list(userId: string, page: number, limit: number, unreadOnly: boolean) {
    const { rows, total } = await this.repository.findMany(userId, { unreadOnly }, (page - 1) * limit, limit);
    return { rows, meta: buildPaginationMeta(page, limit, total) };
  }

  async unreadCount(userId: string) {
    return this.repository.unreadCount(userId);
  }

  async markRead(userId: string, id: string) {
    const notification = await this.repository.findById(id);
    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenError('This notification does not belong to you');
    return this.repository.markRead(id);
  }

  async markAllRead(userId: string) {
    await this.repository.markAllRead(userId);
  }
}

export const notificationService = new NotificationService();
