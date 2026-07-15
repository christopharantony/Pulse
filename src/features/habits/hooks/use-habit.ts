import { useQuery } from '@tanstack/react-query';
import { fetchHabit } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';

export function useHabit(id: string | null) {
  return useQuery({
    queryKey: habitsKeys.detail(id ?? ''),
    queryFn: () => fetchHabit(id as string),
    enabled: !!id,
  });
}
