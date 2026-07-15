import { useQuery } from '@tanstack/react-query';
import { fetchHabitTrash } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';

export function useHabitTrash() {
  return useQuery({
    queryKey: habitsKeys.trash,
    queryFn: () => fetchHabitTrash(),
  });
}
