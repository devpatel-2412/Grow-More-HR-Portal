import { api } from '../../../shared/lib/api-client';
import type { CreateProjectFormValues, CreateMilestoneFormValues } from '../schemas/project.schemas';
import type { ProjectRecord, MilestoneRecord, ProjectStatus, MilestoneStatus } from '../types/project.types';

export interface ListProjectsQuery {
  page: number;
  limit: number;
  status?: ProjectStatus;
  search?: string;
}

export const projectApi = {
  list: (query: ListProjectsQuery) => api.getPaginated<ProjectRecord>('/projects', query),
  get: (id: string) => api.get<ProjectRecord>(`/projects/${id}`),
  create: (values: CreateProjectFormValues) =>
    api.post<ProjectRecord>('/projects', { ...values, description: values.description || undefined, endDate: values.endDate || undefined }),
  createMilestone: (projectId: string, values: CreateMilestoneFormValues) =>
    api.post<MilestoneRecord>(`/projects/${projectId}/milestones`, values),
  listMilestones: (projectId: string) => api.get<MilestoneRecord[]>(`/projects/${projectId}/milestones`),
  updateMilestoneStatus: (id: string, status: MilestoneStatus) => api.patch<MilestoneRecord>(`/milestones/${id}`, { status }),
};
