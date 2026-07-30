export type TimeLogSource = 'TIMER' | 'MANUAL';

export interface TimeLogRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  taskId: string | null;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  source: TimeLogSource;
  createdAt: string;
}

export interface TimeSummary {
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
}
