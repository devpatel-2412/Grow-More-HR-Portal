import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateApi, announcementApi, type CreateTemplatePayload, type CreateAnnouncementPayload } from '../api/hrautomation.api';
import type { TemplateType } from '../types/hrautomation.types';

export function useTemplates(query: { page: number; limit: number; type?: TemplateType }) {
  return useQuery({
    queryKey: ['hrautomation', 'templates', query],
    queryFn: () => templateApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['hrautomation', 'template', id],
    queryFn: () => templateApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => templateApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrautomation', 'templates'] }),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreateTemplatePayload>) => templateApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrautomation'] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templateApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrautomation', 'templates'] }),
  });
}

export function useGenerateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) => templateApi.generate(id, employeeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrautomation', 'generated'] }),
  });
}

export function useGeneratedDocuments(query: { page: number; limit: number; employeeId?: string }) {
  return useQuery({
    queryKey: ['hrautomation', 'generated', query],
    queryFn: () => templateApi.listGenerated(query),
    placeholderData: (previous) => previous,
  });
}

export function useAnnouncements(query: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['hrautomation', 'announcements', query],
    queryFn: () => announcementApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAnnouncementPayload) => announcementApi.publish(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrautomation', 'announcements'] }),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hrautomation', 'announcements'] }),
  });
}
