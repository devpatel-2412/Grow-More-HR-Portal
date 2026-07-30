import { api } from '../../../shared/lib/api-client';
import type { SubmitLeaveFormValues } from '../schemas/leave.schemas';
import type { LeaveRequestRecord, LeaveStatus, LeaveType } from '../types/leave.types';

export interface ListLeaveQuery {
  page: number;
  limit: number;
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
}

export const leaveApi = {
  submit: (values: SubmitLeaveFormValues) => api.post<LeaveRequestRecord>('/leave', values),
  list: (query: ListLeaveQuery) => api.getPaginated<LeaveRequestRecord>('/leave', query),
  approvalQueue: (query: { page: number; limit: number }) => api.getPaginated<LeaveRequestRecord>('/leave/approval-queue', query),
  cancel: (id: string) => api.post<LeaveRequestRecord>(`/leave/${id}/cancel`),
  managerReview: (id: string, status: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>) =>
    api.patch<LeaveRequestRecord>(`/leave/${id}/manager-review`, { status }),
  hrReview: (id: string, status: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>) =>
    api.patch<LeaveRequestRecord>(`/leave/${id}/hr-review`, { status }),
};
