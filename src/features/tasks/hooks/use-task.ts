import { useQuery } from '@tanstack/react-query';
import { fetchTask } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useTask(id: string | null) {
  return useQuery({
    queryKey: tasksKeys.detail(id ?? ''),
    queryFn: () => fetchTask(id as string),
    enabled: !!id,
  });
}
