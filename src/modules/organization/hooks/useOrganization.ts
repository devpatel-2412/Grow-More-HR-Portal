import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchApi, teamApi, type CreateBranchPayload, type CreateTeamPayload } from '../api/organization.api';

// ---------------------------------------------------------------- branches

export function useBranches(query: { page: number; limit: number; search?: string; sort?: string }) {
  return useQuery({
    queryKey: ['organization', 'branches', query],
    queryFn: () => branchApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => branchApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'branches'] }),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<CreateBranchPayload> }) => branchApi.update(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'branches'] }),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => branchApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'branches'] }),
  });
}

// ---------------------------------------------------------------- teams

export function useTeams(query: { page: number; limit: number; search?: string; sort?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['organization', 'teams', query],
    queryFn: () => teamApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeamPayload) => teamApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'teams'] }),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Omit<Partial<CreateTeamPayload>, 'branchId' | 'leadId'> & { branchId?: string | null; leadId?: string | null };
    }) => teamApi.update(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'teams'] }),
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'teams'] }),
  });
}
