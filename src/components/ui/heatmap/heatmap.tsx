'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface HeatmapDay {
  dateISO: string;
  /** null = not scheduled (rendered as an empty/transparent cell). */
  state: 'completed' | 'skipped' | 'partial' | 'missed' | 'pending' | null;
  /** 0-100, used for sequential intensity on 'completed'/'partial' cells. */
  progressPct: number;
}

interface HeatmapProps {
  days: HeatmapDay[];
  /** 0=Sunday..6=Saturday — which weekday starts each column. */
  weekStartsOn?: number;
  className?: string;
}

/** One hue (accent), light→dark by progress — sequential encoding for magnitude, not identity. */
function intensityClass(state: HeatmapDay['state'], progressPct: number): string {
  switch (state) {
    case 'completed':
      return 'bg-accent';
    case 'partial':
      return progressPct >= 60 ? 'bg-accent/60' : progressPct >= 30 ? 'bg-accent/35' : 'bg-accent/15';
    case 'skipped':
      return 'bg-muted/40';
    case 'missed':
      return 'bg-destructive/20';
    case 'pending':
      return 'bg-surface-elevated border border-dashed border-border';
    default:
      return 'bg-transparent';
  }
}

const STATE_LABEL: Record<NonNullable<HeatmapDay['state']>, string> = {
  completed: 'Completed',
  partial: 'Partial',
  skipped: 'Skipped',
  missed: 'Missed',
  pending: 'Today',
};

/**
 * GitHub-style contribution heatmap — weeks as columns, weekdays as rows. `days` must already be
 * ordered chronologically (as the calendar API returns them); this component only handles layout
 * and color, all scheduling/derived-state logic lives server-side (see habit-schedule.ts).
 */
export function Heatmap({ days, weekStartsOn = 0, className }: HeatmapProps) {
  const [hovered, setHovered] = useState<HeatmapDay | null>(null);

  if (days.length === 0) {
    return <p className="text-caption text-muted-foreground">No data for this range yet.</p>;
  }

  const first = new Date(days[0].dateISO);
  const leadingBlanks = (first.getUTCDay() - weekStartsOn + 7) % 7;
  const cells: (HeatmapDay | null)[] = [...Array(leadingBlanks).fill(null), ...days];
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label="Habit completion heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <button
                key={di}
                type="button"
                disabled={!day || day.state === null}
                onMouseEnter={() => day && setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => day && setHovered(day)}
                onBlur={() => setHovered(null)}
                aria-label={day && day.state ? `${day.dateISO}: ${STATE_LABEL[day.state]}` : undefined}
                className={cn(
                  'size-3 shrink-0 rounded-[2px] transition-transform',
                  day ? intensityClass(day.state, day.progressPct) : 'bg-transparent',
                  day?.state && 'hover:scale-125 focus-visible:scale-125 focus-visible:outline-none'
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex h-5 items-center text-caption text-muted-foreground">
        {hovered ? (
          <span>
            {hovered.dateISO} — {hovered.state ? STATE_LABEL[hovered.state] : 'Not scheduled'}
            {hovered.state === 'partial' || hovered.state === 'completed' ? ` (${hovered.progressPct}%)` : ''}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            Less
            <span className="size-3 rounded-[2px] bg-accent/15" />
            <span className="size-3 rounded-[2px] bg-accent/35" />
            <span className="size-3 rounded-[2px] bg-accent/60" />
            <span className="size-3 rounded-[2px] bg-accent" />
            More
          </span>
        )}
      </div>
    </div>
  );
}
