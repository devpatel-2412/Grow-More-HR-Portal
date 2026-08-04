export type NotificationType = 'TASK_ASSIGNED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'TICKET_ASSIGNED' | 'DOCUMENT_EXPIRING' | 'GENERIC';

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
