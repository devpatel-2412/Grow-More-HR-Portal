import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi, type ListProjectsQuery } from '../api/project.api';
import type { CreateProjectFormValues } from '../schemas/project.schemas';

export function useProjects(query: ListProjectsQuery) {
  return useQuery({
    queryKey: ['projects', query],
    queryFn: () => projectApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: () => projectApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateProjectFormValues) => projectApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<CreateProjectFormValues> }) => projectApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
