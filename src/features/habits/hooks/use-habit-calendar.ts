import { useQuery } from '@tanstack/react-query';
import { fetchHabitCalendar } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';

export function useHabitCalendar(id: string | null, from: string, to: string) {
  return useQuery({
    queryKey: habitsKeys.calendar(id ?? '', from, to),
    queryFn: () => fetchHabitCalendar(id as string, from, to),
    enabled: !!id && !!from && !!to,
  });
}
