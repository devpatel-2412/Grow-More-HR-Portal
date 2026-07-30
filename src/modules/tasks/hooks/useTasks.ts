import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi, type ListTasksQuery } from '../api/task.api';
import type { CreateTaskFormValues } from '../schemas/task.schemas';
import type { TaskStatus } from '../types/task.types';

export function useTasks(query: ListTasksQuery) {
  return useQuery({
    queryKey: ['tasks', query],
    queryFn: () => taskApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: () => taskApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateTaskFormValues) => taskApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => taskApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
