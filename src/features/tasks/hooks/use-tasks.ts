import { useQuery } from '@tanstack/react-query';
import { fetchTasks, type TaskListQuery } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useTasks(query: TaskListQuery = {}) {
  return useQuery({
    queryKey: tasksKeys.list(query),
    queryFn: () => fetchTasks(query),
    staleTime: 30_000,
  });
}
