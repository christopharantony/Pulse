import { useQuery } from '@tanstack/react-query';
import { searchHabitsRequest } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';

export function useSearchHabits(q: string) {
  return useQuery({
    queryKey: habitsKeys.search(q),
    queryFn: () => searchHabitsRequest(q),
    enabled: q.trim().length > 0,
  });
}
