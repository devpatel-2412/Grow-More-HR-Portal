import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/project.api';
import type { CreateMilestoneFormValues } from '../schemas/project.schemas';
import type { MilestoneStatus } from '../types/project.types';

export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => projectApi.listMilestones(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateMilestoneFormValues) => projectApi.createMilestone(projectId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });
}

export function useUpdateMilestoneStatus(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MilestoneStatus }) => projectApi.updateMilestoneStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });
}
