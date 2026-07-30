import { api } from '../../../shared/lib/api-client';
import type { CreateTaskFormValues, CreateCommentFormValues, CreateAttachmentFormValues } from '../schemas/task.schemas';
import type { TaskRecord, TaskCommentRecord, TaskAttachmentRecord, TaskStatus, TaskPriority } from '../types/task.types';

export interface ListTasksQuery {
  page: number;
  limit: number;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
}

export const taskApi = {
  list: (query: ListTasksQuery) => api.getPaginated<TaskRecord>('/tasks', query),
  get: (id: string) => api.get<TaskRecord>(`/tasks/${id}`),
  create: (values: CreateTaskFormValues) =>
    api.post<TaskRecord>('/tasks', {
      ...values,
      description: values.description || undefined,
      dueDate: values.dueDate || undefined,
      assignedToId: values.assignedToId || undefined,
    }),
  updateStatus: (id: string, status: TaskStatus) => api.patch<TaskRecord>(`/tasks/${id}`, { status }),
  update: (id: string, values: Partial<{ title: string; priority: TaskPriority; assignedToId: string | null; dueDate: string | null }>) =>
    api.patch<TaskRecord>(`/tasks/${id}`, values),
  listComments: (taskId: string) => api.get<TaskCommentRecord[]>(`/tasks/${taskId}/comments`),
  addComment: (taskId: string, values: CreateCommentFormValues) => api.post<TaskCommentRecord>(`/tasks/${taskId}/comments`, values),
  listAttachments: (taskId: string) => api.get<TaskAttachmentRecord[]>(`/tasks/${taskId}/attachments`),
  addAttachment: (taskId: string, values: CreateAttachmentFormValues) =>
    api.post<TaskAttachmentRecord>(`/tasks/${taskId}/attachments`, values),
};
