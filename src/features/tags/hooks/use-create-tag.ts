import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTagRequest, type CreateTagInput } from '@/features/tags/api/tags.api';
import { tagsKeys } from '@/features/tags/hooks/query-keys';

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTagInput) => createTagRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.all });
    },
  });
}
