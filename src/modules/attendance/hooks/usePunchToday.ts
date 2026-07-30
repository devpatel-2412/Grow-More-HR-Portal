import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '../api/attendance.api';

export function usePunchToday() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: attendanceApi.today,
    refetchInterval: 60_000, // keep the live countdown in sync if punched in/out elsewhere
  });
}
