import { useQuery } from '@tanstack/react-query';
import { searchTasksRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useSearchTasks(q: string) {
  return useQuery({
    queryKey: tasksKeys.search(q),
    queryFn: () => searchTasksRequest(q),
    enabled: q.trim().length > 0,
    staleTime: 10_000,
  });
}
