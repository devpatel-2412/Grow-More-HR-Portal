import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../api/task.api';
import type { CreateCommentFormValues, CreateAttachmentFormValues } from '../schemas/task.schemas';

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'comments', taskId],
    queryFn: () => taskApi.listComments(taskId!),
    enabled: !!taskId,
  });
}

export function useAddComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateCommentFormValues) => taskApi.addComment(taskId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'comments', taskId] });
    },
  });
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'attachments', taskId],
    queryFn: () => taskApi.listAttachments(taskId!),
    enabled: !!taskId,
  });
}

export function useAddAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateAttachmentFormValues) => taskApi.addAttachment(taskId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'attachments', taskId] });
    },
  });
}
