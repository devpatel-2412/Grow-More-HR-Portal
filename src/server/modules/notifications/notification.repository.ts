import { prisma } from '../../db/prisma.js';
import type { Prisma, NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export class NotificationRepository {
  create(input: CreateNotificationInput) {
    return prisma.notification.create({ data: input });
  }

  async findMany(userId: string, filter: { unreadOnly: boolean }, skip: number, take: number) {
    const where: Prisma.NotificationWhereInput = { userId, readAt: filter.unreadOnly ? null : undefined };
    const [rows, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.notification.count({ where }),
    ]);
    return { rows, total };
  }

  unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  }

  markRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
