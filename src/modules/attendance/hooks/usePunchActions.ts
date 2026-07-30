import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api/attendance.api';

function useAttendanceMutation(fn: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function usePunchIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { gpsCoordinates?: string; deviceType?: string }) => attendanceApi.punchIn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function usePunchOut() {
  return useAttendanceMutation(() => attendanceApi.punchOut());
}

export function useBreakStart() {
  return useAttendanceMutation(() => attendanceApi.breakStart());
}

export function useBreakEnd() {
  return useAttendanceMutation(() => attendanceApi.breakEnd());
}
