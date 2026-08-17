export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskRecord {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  assignedToId: string | null;
  loggedHours: number;
  parentTaskId: string | null;
  /** Omitted by the list endpoint (GET /tasks); only populated by the single-task fetch. */
  subtasks?: TaskRecord[];
  createdAt: string;
}

export interface TaskCommentRecord {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TaskAttachmentRecord {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  addedById: string;
  createdAt: string;
}
