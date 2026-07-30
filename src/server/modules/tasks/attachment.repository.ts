import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class AttachmentRepository {
  create(data: Prisma.TaskAttachmentCreateInput) {
    return prisma.taskAttachment.create({ data });
  }

  findByTask(taskId: string) {
    return prisma.taskAttachment.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
  }
}
