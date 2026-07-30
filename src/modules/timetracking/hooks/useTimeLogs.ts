import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeLogApi, type ListTimeLogQuery, type ManualTimeLogPayload, type TimeSummaryQuery } from '../api/timelog.api';

const TIME_LOG_KEY = ['time-logs'];

export function useRunningTimer() {
  return useQuery({
    queryKey: ['time-logs', 'running'],
    queryFn: () => timeLogApi.running(),
  });
}

export function useTimeLogs(query: ListTimeLogQuery) {
  return useQuery({
    queryKey: ['time-logs', 'list', query],
    queryFn: () => timeLogApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useTimeSummary(query: TimeSummaryQuery) {
  return useQuery({
    queryKey: ['time-logs', 'summary', query],
    queryFn: () => timeLogApi.summary(query),
  });
}

export function useStartTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { taskId?: string; description?: string }) => timeLogApi.startTimer(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIME_LOG_KEY }),
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (description?: string) => timeLogApi.stopTimer(description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIME_LOG_KEY });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCreateManualLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManualTimeLogPayload) => timeLogApi.createManual(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIME_LOG_KEY });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTimeLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeLogApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIME_LOG_KEY });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
