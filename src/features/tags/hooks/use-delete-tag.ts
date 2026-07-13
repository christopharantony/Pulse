import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTagRequest } from '@/features/tags/api/tags.api';
import { tagsKeys } from '@/features/tags/hooks/query-keys';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTagRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.all });
      // Deleting a tag pulls it off every task that referenced it — task lists need to reflect that.
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
