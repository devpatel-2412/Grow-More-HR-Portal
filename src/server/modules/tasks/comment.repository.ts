import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class CommentRepository {
  create(data: Prisma.TaskCommentCreateInput) {
    return prisma.taskComment.create({ data });
  }

  findByTask(taskId: string) {
    return prisma.taskComment.findMany({ where: { taskId }, orderBy: { createdAt: 'asc' } });
  }
}
