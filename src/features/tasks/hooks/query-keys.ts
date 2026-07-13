import type { TaskListQuery } from '@/features/tasks/api/tasks.api';

/** Query-key factory for task data (mirrors `dashboardKeys`/`authKeys`). */
export const tasksKeys = {
  all: ['tasks'] as const,
  lists: () => ['tasks', 'list'] as const,
  list: (query: TaskListQuery) => ['tasks', 'list', query] as const,
  details: () => ['tasks', 'detail'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  trash: ['tasks', 'trash'] as const,
  search: (q: string) => ['tasks', 'search', q] as const,
  comments: (taskId: string) => ['tasks', 'comments', taskId] as const,
};
