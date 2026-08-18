export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type MilestoneStatus = 'PENDING' | 'COMPLETED';

export interface ProjectMemberSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
  /** Computed server-side from real Task rows (see ProjectService) — optional because older/mocked
   * responses may omit them; treat a missing value as "no data yet", not zero. */
  progress?: number;
  openTasksCount?: number;
  totalTasksCount?: number;
  members?: ProjectMemberSummary[];
  /** Only meaningful for the caller making the request — how many of THEIR OWN tasks in this
   * project are still open. */
  myOpenTasksCount?: number;
}

export interface MilestoneRecord {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  status: MilestoneStatus;
}
