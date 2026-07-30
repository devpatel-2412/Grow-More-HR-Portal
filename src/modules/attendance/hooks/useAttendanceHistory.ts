import { useQuery } from '@tanstack/react-query';
import { attendanceApi, type ListAttendanceQuery } from '../api/attendance.api';

export function useAttendanceHistory(query: ListAttendanceQuery) {
  return useQuery({
    queryKey: ['attendance', 'history', query],
    queryFn: () => attendanceApi.list(query),
    placeholderData: (previous) => previous,
  });
}
