export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALFDAY';
export type RegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceBreakEntry {
  id: string;
  breakIn: string;
  breakOut: string | null;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  overBreakMinutes: number;
  requiredLogoutTime: string | null;
  gpsCoordinates: string | null;
  deviceType: string | null;
  /** Present on a single-record fetch (e.g. today's attendance); omitted from the paginated list
   * response, which never needs per-break detail — see attendance.repository.ts's findManyByTenant. */
  breaks?: AttendanceBreakEntry[];
}

export interface TodayAttendance extends AttendanceRecord {
  onBreak: boolean;
  liveRequiredLogoutTime: string;
  liveOverBreakMinutes: number;
}

export interface RegularizationRequest {
  id: string;
  employeeId: string;
  date: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: RegularizationStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
}
