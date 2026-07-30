import { CommentRepository } from './comment.repository.js';
import { TaskService } from './task.service.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import type { z } from 'zod';
import type { createCommentSchema } from './task.validators.js';

export class CommentService {
  constructor(
    private readonly repository: CommentRepository = new CommentRepository(),
    private readonly taskService: TaskService = new TaskService(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  async add(tenantId: string, userId: string, taskId: string, input: z.infer<typeof createCommentSchema>) {
    await this.taskService.getById(tenantId, taskId); // 404s if the task isn't in this tenant
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');

    return this.repository.create({
      tenant: { connect: { id: tenantId } },
      task: { connect: { id: taskId } },
      author: { connect: { id: profile.id } },
      body: input.body,
    });
  }

  async listForTask(tenantId: string, taskId: string) {
    await this.taskService.getById(tenantId, taskId);
    return this.repository.findByTask(taskId);
  }
}

export const commentService = new CommentService();
