import type { GoalListQuery } from '@/features/goals/api/goals.api';

/** Query-key factory for goal data (mirrors `habitsKeys`). */
export const goalsKeys = {
  all: ['goals'] as const,
  lists: () => ['goals', 'list'] as const,
  list: (query: GoalListQuery) => ['goals', 'list', query] as const,
  details: () => ['goals', 'detail'] as const,
  detail: (id: string) => ['goals', 'detail', id] as const,
  statistics: (id: string) => ['goals', 'statistics', id] as const,
  overviewStatistics: (range?: { from?: string; to?: string }) => ['goals', 'statistics', 'overview', range ?? {}] as const,
  activity: (id: string) => ['goals', 'activity', id] as const,
  milestones: (goalId: string) => ['goals', 'milestones', goalId] as const,
  linkedTasks: (goalId: string) => ['goals', 'tasks', goalId] as const,
  linkedHabits: (goalId: string) => ['goals', 'habits', goalId] as const,
  trash: ['goals', 'trash'] as const,
  search: (q: string) => ['goals', 'search', q] as const,
};
