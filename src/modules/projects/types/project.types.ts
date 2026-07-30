export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type MilestoneStatus = 'PENDING' | 'COMPLETED';

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: ProjectStatus;
}

export interface MilestoneRecord {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  status: MilestoneStatus;
}
