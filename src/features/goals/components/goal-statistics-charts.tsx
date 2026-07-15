'use client';

import { StatCard } from '@/components/ui/stat-card';
import { CardSkeleton } from '@/components/feedback/skeleton';
import { useGoalStatistics } from '@/features/goals/hooks/use-goal-statistics';

interface GoalStatisticsChartsProps {
  goalId: string;
}

export function GoalStatisticsCharts({ goalId }: GoalStatisticsChartsProps) {
  const { data: stats, isLoading } = useGoalStatistics(goalId);

  if (isLoading) return <CardSkeleton />;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Milestones" value={`${stats.milestonesCompleted}/${stats.milestonesTotal}`} />
      <StatCard label="Tasks done" value={`${stats.tasksCompleted}/${stats.tasksTotal}`} />
      <StatCard label="Tasks overdue" value={stats.tasksOverdue} />
      <StatCard label="Habit contribution" value={stats.habitContribution} />
      <StatCard label="Days elapsed" value={stats.daysElapsed} />
      <StatCard label="Days remaining" value={stats.daysRemaining ?? '—'} />
      <StatCard
        label="Pace"
        value={stats.onTrack == null ? '—' : stats.onTrack ? 'On track' : 'Behind'}
        trend={stats.onTrack == null ? undefined : { direction: stats.onTrack ? 'up' : 'down', value: stats.onTrack ? '✓' : '!' }}
      />
    </div>
  );
}
