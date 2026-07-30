import { AttachmentRepository } from './attachment.repository.js';
import { TaskService } from './task.service.js';
import type { z } from 'zod';
import type { createAttachmentSchema } from './task.validators.js';

export class AttachmentService {
  constructor(
    private readonly repository: AttachmentRepository = new AttachmentRepository(),
    private readonly taskService: TaskService = new TaskService(),
  ) {}

  async add(tenantId: string, userId: string, taskId: string, input: z.infer<typeof createAttachmentSchema>) {
    await this.taskService.getById(tenantId, taskId);
    return this.repository.create({
      tenant: { connect: { id: tenantId } },
      task: { connect: { id: taskId } },
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      addedById: userId,
    });
  }

  async listForTask(tenantId: string, taskId: string) {
    await this.taskService.getById(tenantId, taskId);
    return this.repository.findByTask(taskId);
  }
}

export const attachmentService = new AttachmentService();
