import type { HabitListQuery } from '@/features/habits/api/habits.api';

/** Query-key factory for habit data (mirrors `tasksKeys`). */
export const habitsKeys = {
  all: ['habits'] as const,
  lists: () => ['habits', 'list'] as const,
  list: (query: HabitListQuery) => ['habits', 'list', query] as const,
  details: () => ['habits', 'detail'] as const,
  detail: (id: string) => ['habits', 'detail', id] as const,
  calendarRoot: (id: string) => ['habits', 'calendar', id] as const,
  calendar: (id: string, from: string, to: string) => ['habits', 'calendar', id, from, to] as const,
  statistics: (id: string) => ['habits', 'statistics', id] as const,
  trash: ['habits', 'trash'] as const,
  search: (q: string) => ['habits', 'search', q] as const,
};
