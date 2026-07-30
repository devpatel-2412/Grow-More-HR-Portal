import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { regularizationApi, type ListRegularizationsQuery } from '../api/regularization.api';
import type { RegularizationRequestFormValues } from '../schemas/attendance.schemas';
import type { RegularizationStatus } from '../types/attendance.types';

export function useRegularizations(query: ListRegularizationsQuery) {
  return useQuery({
    queryKey: ['attendance', 'regularizations', query],
    queryFn: () => regularizationApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useRequestRegularization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: RegularizationRequestFormValues) => regularizationApi.request(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'regularizations'] });
    },
  });
}

export function useReviewRegularization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<RegularizationStatus, 'APPROVED' | 'REJECTED'> }) =>
      regularizationApi.review(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
