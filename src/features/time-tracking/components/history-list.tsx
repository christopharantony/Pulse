'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { formatElapsedTime } from '@/lib/time/format';
import { useHistory } from '@/features/time-tracking/hooks/use-history';

function formatDayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function HistoryList() {
  const { data: days, isLoading } = useHistory(10);

  if (isLoading) return <TableSkeleton rows={10} columns={2} />;

  if (!days || days.every((day) => day.sessionCount === 0)) {
    return <EmptyState title="No tracked time yet" description="Start a timer above and it will show up here." />;
  }

  return (
    <ol className="flex flex-col gap-2" role="list">
      {days.map((day) => (
        <li
          key={day.dayKey}
          className="flex items-center justify-between rounded-md border border-border-subtle bg-surface/30 px-4 py-2.5 text-small"
        >
          <span className="text-foreground">{formatDayLabel(day.dayKey)}</span>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{day.sessionCount} {day.sessionCount === 1 ? 'session' : 'sessions'}</span>
            <span className="font-mono tabular-nums text-foreground">{formatElapsedTime(day.totalSeconds)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
