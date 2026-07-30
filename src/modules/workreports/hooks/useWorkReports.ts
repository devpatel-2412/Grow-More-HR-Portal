import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workReportApi, type ListWorkReportQuery, type SubmitWorkReportPayload } from '../api/workreport.api';

export function useWorkReports(query: ListWorkReportQuery) {
  return useQuery({
    queryKey: ['work-reports', 'list', query],
    queryFn: () => workReportApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useWorkReportReviewQueue(query: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['work-reports', 'review-queue', query],
    queryFn: () => workReportApi.reviewQueue(query),
    placeholderData: (previous) => previous,
  });
}

export function useSubmitWorkReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitWorkReportPayload) => workReportApi.submit(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-reports'] }),
  });
}

export function useReviewWorkReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reviewNote }: { id: string; status: 'APPROVED' | 'REJECTED'; reviewNote?: string }) =>
      workReportApi.review(id, status, reviewNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-reports'] }),
  });
}
