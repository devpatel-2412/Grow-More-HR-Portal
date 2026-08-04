import { NotificationRepository, type CreateNotificationInput } from './notification.repository.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-error.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';

export class NotificationService {
  constructor(private readonly repository: NotificationRepository = new NotificationRepository()) {}

  /**
   * The one entry point every other module should call to notify a user — mirrors
   * AuditLogService's role for the audit trail. A write failure here must never break the
   * calling request (e.g. assigning a task should succeed even if the notification insert fails).
   */
  async notify(input: CreateNotificationInput): Promise<void> {
    try {
      await this.repository.create(input);
    } catch {
      // Deliberately swallowed — notifications are a convenience, not a system of record.
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
