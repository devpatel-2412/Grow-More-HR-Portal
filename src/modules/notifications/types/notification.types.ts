export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'TICKET_ASSIGNED'
  | 'DOCUMENT_EXPIRING'
  | 'GENERIC'
  | 'LEAVE_REQUESTED'
  | 'PAYSLIP_AVAILABLE'
  | 'PROJECT_ASSIGNED'
  | 'TASK_READY_FOR_REVIEW'
  | 'TASK_COMPLETED'
  | 'TASK_REOPENED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE';

export interface NotificationRecord {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
