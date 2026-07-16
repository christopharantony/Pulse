'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { cn } from '@/lib/utils';
import { formatElapsedTime } from '@/lib/time/format';
import { useQuickStartActivities } from '@/features/time-tracking/hooks/use-quick-start-activities';
import { useStartTimer } from '@/features/time-tracking/hooks/use-start-timer';
import { useRunningSession } from '@/features/time-tracking/hooks/use-running-session';

const SOURCE_DOT_COLOR: Record<string, string> = {
  task: 'bg-accent',
  habit: 'bg-success',
  goal: 'bg-warning',
  calendar_event: 'bg-accent',
  quick_focus: 'bg-muted-foreground',
  custom: 'bg-muted-foreground',
};

/**
 * The Time Tracker page's "Recent" list — recently-tracked activities (any source) that can be
 * resumed with one click. Resuming calls the same generic `startTimer` path as the recent-activity
 * suggestions in `StartTimerCombobox` (`{ activityId }`), which auto-stops whatever's currently
 * running server-side.
 */
export function RecentActivities() {
  const { data: activities, isLoading } = useQuickStartActivities();
  const { data: running } = useRunningSession();
  const startTimer = useStartTimer();

  if (isLoading) return <TableSkeleton rows={5} columns={2} />;

  if (!activities || activities.length === 0) {
    return <EmptyState title="No tracked time yet" description="Start a timer above and it will show up here." />;
  }

  return (
    <ul className="flex flex-col gap-1" role="list">
      {activities.map((activity) => {
        const isActive = running?.activityId === activity.id;
        return (
          <li key={activity.id}>
            <button
              type="button"
              disabled={isActive || startTimer.isPending}
              onClick={() => startTimer.mutateAsync({ activityId: activity.id })}
              className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-base hover:bg-surface disabled:cursor-default"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    isActive ? 'bg-success' : (SOURCE_DOT_COLOR[activity.sourceType] ?? 'bg-muted-foreground')
                  )}
                />
                <span className={cn('truncate text-sm', isActive ? 'font-semibold text-foreground' : 'text-foreground')}>
                  {activity.title}
                </span>
              </span>
              <span className="shrink-0 font-mono text-small tabular-nums text-muted-foreground">
                {formatElapsedTime(activity.totalTrackedSeconds)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
