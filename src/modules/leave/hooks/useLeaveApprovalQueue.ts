import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../api/leave.api';
import type { LeaveStatus } from '../types/leave.types';

export function useLeaveApprovalQueue(query: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['leave', 'approval-queue', query],
    queryFn: () => leaveApi.approvalQueue(query),
    placeholderData: (previous) => previous,
  });
}

export function useManagerReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'> }) =>
      leaveApi.managerReview(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

export function useHrReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'> }) =>
      leaveApi.hrReview(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}
