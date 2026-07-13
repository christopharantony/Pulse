import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addCommentRequest, deleteCommentRequest, fetchComments } from '@/features/tasks/api/task-comments.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: tasksKeys.comments(taskId ?? ''),
    queryFn: () => fetchComments(taskId as string),
    enabled: !!taskId,
  });
}

export function useAddComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addCommentRequest(taskId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.comments(taskId) }),
  });
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteCommentRequest(taskId, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.comments(taskId) }),
  });
}
