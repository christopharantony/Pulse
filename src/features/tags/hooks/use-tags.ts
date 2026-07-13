import { useQuery } from '@tanstack/react-query';
import { fetchTags } from '@/features/tags/api/tags.api';
import { tagsKeys } from '@/features/tags/hooks/query-keys';

export function useTags() {
  return useQuery({
    queryKey: tagsKeys.all,
    queryFn: fetchTags,
    staleTime: 60_000,
  });
}
