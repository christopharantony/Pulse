import { useQuery } from '@tanstack/react-query';
import { fetchHabitStatistics } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';

export function useHabitStatistics(id: string | null) {
  return useQuery({
    queryKey: habitsKeys.statistics(id ?? ''),
    queryFn: () => fetchHabitStatistics(id as string),
    enabled: !!id,
  });
}
