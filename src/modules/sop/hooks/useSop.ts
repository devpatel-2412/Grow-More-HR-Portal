import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sopApi, type CreateSopPayload } from '../api/sop.api';
import type { SopStatus } from '../types/sop.types';

export function useSops(query: { page: number; limit: number; search?: string; sort?: string; status?: SopStatus; category?: string; department?: string }) {
  return useQuery({
    queryKey: ['sop', 'list', query],
    queryFn: () => sopApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useSop(id: string | undefined) {
  return useQuery({
    queryKey: ['sop', 'detail', id],
    queryFn: () => sopApi.get(id!),
    enabled: !!id,
  });
}

export function useSopRevisions(id: string | undefined) {
  return useQuery({
    queryKey: ['sop', 'revisions', id],
    queryFn: () => sopApi.listRevisions(id!),
    enabled: !!id,
  });
}

function invalidateSops(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['sop', 'list'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['sop', 'detail', id] });
    queryClient.invalidateQueries({ queryKey: ['sop', 'revisions', id] });
  }
}

export function useCreateSop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSopPayload) => sopApi.create(payload),
    onSuccess: () => invalidateSops(queryClient),
  });
}

export function useUpdateSop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Omit<Partial<CreateSopPayload>, 'ownerId'> & { ownerId?: string | null };
    }) => sopApi.update(id, values),
    onSuccess: (_data, variables) => invalidateSops(queryClient, variables.id),
  });
}

export function useDeleteSop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sopApi.remove(id),
    onSuccess: () => invalidateSops(queryClient),
  });
}

export function usePublishSop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sopApi.publish(id),
    onSuccess: (_data, id) => invalidateSops(queryClient, id),
  });
}

export function useArchiveSop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sopApi.archive(id),
    onSuccess: (_data, id) => invalidateSops(queryClient, id),
  });
}
