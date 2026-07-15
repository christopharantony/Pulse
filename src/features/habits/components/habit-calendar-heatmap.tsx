'use client';

import { useMemo, useState } from 'react';
import { Heatmap } from '@/components/ui/heatmap';
import { Skeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { useHabitCalendar } from '@/features/habits/hooks/use-habit-calendar';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const RANGE_OPTIONS = [
  { label: '3 months', days: 90 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
];

export function HabitCalendarHeatmap({ habitId }: { habitId: string }) {
  const [rangeDays, setRangeDays] = useState(182);
  const from = useMemo(() => isoDaysAgo(rangeDays), [rangeDays]);
  const to = useMemo(() => isoDaysAgo(0), []);
  const { data, isLoading } = useHabitCalendar(habitId, from, to);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-label text-muted-foreground">Consistency</h3>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.days}
              type="button"
              size="sm"
              variant={rangeDays === opt.days ? 'secondary' : 'ghost'}
              onClick={() => setRangeDays(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <Heatmap days={data.days} />
      )}
    </div>
  );
}
