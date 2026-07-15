import { useQuery } from '@tanstack/react-query';
import { fetchHabits, type HabitListQuery } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';

export function useHabits(query: HabitListQuery = {}) {
  return useQuery({
    queryKey: habitsKeys.list(query),
    queryFn: () => fetchHabits(query),
    staleTime: 30_000,
  });
}
