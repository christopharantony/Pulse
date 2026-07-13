import 'server-only';
import type { StatCardData, StatisticsData } from '@/features/dashboard/types/dashboard';
import type { TodayMetrics } from '@/features/dashboard/services/metrics.aggregator';

/** Human-readable "Xh Ym" / "Ym" for a minute count. */
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * The MVP statistics tiles, formatted from the shared today-metrics. Weekly Progress and Project
 * Progress are deferred to Phase 2 (design §3). Overdue carries a `down` trend tone so a non-zero
 * value reads as attention-needed rather than neutral.
 */
export function buildStatistics(metrics: TodayMetrics): StatisticsData {
  const cards: StatCardData[] = [
    { key: 'todaysTasks', label: 'Today’s Tasks', value: metrics.todaysTasks },
    { key: 'completedToday', label: 'Completed Today', value: metrics.completedToday },
    {
      key: 'habitsCompleted',
      label: 'Habits Completed',
      value: `${metrics.habitsCompletedToday}/${metrics.habitsScheduledToday}`,
    },
    { key: 'currentStreak', label: 'Current Streak', value: metrics.topCurrentStreak, unit: 'days' },
    { key: 'focusTimeToday', label: 'Focus Time', value: formatMinutes(metrics.focusMinutes) },
    {
      key: 'overdueTasks',
      label: 'Overdue',
      value: metrics.overdueTasks,
      trend:
        metrics.overdueTasks > 0
          ? { direction: 'down', value: 'Needs attention' }
          : { direction: 'up', value: 'All clear' },
    },
  ];

  return { cards };
}
