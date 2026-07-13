import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTagRequest, type UpdateTagInput } from '@/features/tags/api/tags.api';
import { tagsKeys } from '@/features/tags/hooks/query-keys';

export function useRenameTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTagInput }) => updateTagRequest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.all });
    },
  });
}
