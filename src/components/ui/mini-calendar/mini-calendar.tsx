'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';
import type { CalendarDay } from '@/features/dashboard/types/dashboard';

interface MiniCalendarProps {
  /** `YYYY-MM` of the displayed month. */
  month: string;
  days: CalendarDay[];
  weekStartsOn: number;
  onPrev?: () => void;
  onNext?: () => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const INDICATOR_CLASS: Record<string, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  secondary: 'bg-secondary-glow',
  warning: 'bg-warning',
};

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * A compact month grid with a colored indicator dot per day for tasks / habits / events /
 * milestones. Layout-only; all data (which days, which indicators, "today") is computed server-side
 * and passed in. Weekday headers rotate to honor the workspace week-start.
 */
export function MiniCalendar({ month, days, weekStartsOn, onPrev, onNext }: MiniCalendarProps) {
  const headers = Array.from({ length: 7 }, (_, i) => WEEKDAYS[(weekStartsOn + i) % 7]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-label text-foreground">{monthLabel(month)}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous month"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <ChevronLeftIcon size={16} isAnimated={false} />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next month"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <ChevronRightIcon size={16} isAnimated={false} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {headers.map((h, i) => (
          <span key={i} className="text-caption text-muted-foreground">
            {h}
          </span>
        ))}

        {days.map((day) => {
          const dayNum = Number(day.dateISO.split('-')[2]);
          return (
            <div
              key={day.dateISO}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-caption',
                day.inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                day.isToday && 'bg-accent/15 font-semibold text-accent'
              )}
            >
              <span>{dayNum}</span>
              <span className="flex h-1 items-center gap-0.5">
                {day.indicators.slice(0, 3).map((indicator) => (
                  <span
                    key={indicator.type}
                    aria-hidden
                    className={cn('size-1 rounded-full', INDICATOR_CLASS[indicator.color] ?? 'bg-muted')}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
