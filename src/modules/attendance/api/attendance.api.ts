import { api } from '../../../shared/lib/api-client';
import type { AttendanceRecord, TodayAttendance } from '../types/attendance.types';

export interface ListAttendanceQuery {
  page: number;
  limit: number;
  employeeId?: string;
  from?: string;
  to?: string;
}

export const attendanceApi = {
  punchIn: (input: { gpsCoordinates?: string; deviceType?: string }) =>
    api.post<AttendanceRecord>('/attendance/punch-in', input),
  punchOut: () => api.post<AttendanceRecord>('/attendance/punch-out'),
  breakStart: () => api.post<AttendanceRecord>('/attendance/break/start'),
  breakEnd: () => api.post<AttendanceRecord>('/attendance/break/end'),
  today: () => api.get<TodayAttendance | null>('/attendance/today'),
  list: (query: ListAttendanceQuery) => api.getPaginated<AttendanceRecord>('/attendance', query),
};
