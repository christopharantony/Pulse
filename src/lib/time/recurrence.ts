import type { Recurrence } from '@/schemas/schedulable.schema';
import { addDaysToDayKey, type DayParts } from '@/lib/time/day';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The UTC-midnight day-key for a `DayParts` triple — lets anchor math reuse day-key arithmetic. */
function dayKeyFromParts(parts: DayParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/**
 * Whether a recurrence is "scheduled" on a given calendar day. Used to decide which habits appear
 * in "Today's Habits", to expand a habit schedule across the calendar/heatmap, and to drive streak
 * calculations. Deliberately pragmatic (not a full RRULE engine):
 *  - `daily` — every `interval`-th day since the anchor (interval 1 = every day).
 *  - `weekly` — days named in `daysOfWeek` (defaulting to the anchor's own weekday when none are
 *    named — seeing "weekly" with no days picked as "every day" would silently defeat the point of
 *    choosing weekly), on every `interval`-th week since the anchor's week.
 *  - `monthly` / `yearly` — matched against `anchor` (the day-of-month, and for yearly the month
 *    too) so the habit surfaces on the same day it started, every `interval`-th month/year.
 *  - `none` — never scheduled (a `none` recurrence is only valid when a habit uses `specificDates`
 *    instead — see `features/habits/services/habit-schedule.ts`).
 * `endDate` (when set) closes the schedule. All day-difference math is done on UTC-midnight
 * day-keys (never raw instants), so it is DST-safe by construction.
 */
export function isScheduledOn(
  recurrence: Recurrence,
  dayKey: Date,
  anchor?: DayParts | null
): boolean {
  if (recurrence.endDate && dayKey.getTime() > new Date(recurrence.endDate).getTime()) {
    return false;
  }
  if (recurrence.frequency === 'none') return false;

  // No anchor available: fall back to anchor === dayKey (diff 0), which makes `interval` a no-op
  // for daily/weekly (0 % n === 0 always) rather than throwing — monthly/yearly still require a
  // real anchor to know which day-of-month/month to match, same as before this fix.
  const anchorDayKey = anchor ? dayKeyFromParts(anchor) : dayKey;
  if (dayKey.getTime() < anchorDayKey.getTime()) return false;

  const dayDiff = Math.round((dayKey.getTime() - anchorDayKey.getTime()) / MS_PER_DAY);
  const interval = recurrence.interval ?? 1;
  const weekday = dayKey.getUTCDay(); // 0=Sunday..6=Saturday
  const dayOfMonth = dayKey.getUTCDate();
  const month = dayKey.getUTCMonth();

  switch (recurrence.frequency) {
    case 'daily':
      return dayDiff % interval === 0;
    case 'weekly': {
      const days =
        recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0
          ? recurrence.daysOfWeek
          : [anchorDayKey.getUTCDay()];
      if (!days.includes(weekday)) return false;
      const weekIndex = Math.floor(dayDiff / 7);
      return weekIndex % interval === 0;
    }
    case 'monthly': {
      if (!anchor) return false;
      const monthsSinceAnchor =
        (dayKey.getUTCFullYear() - anchor.year) * 12 + month - (anchor.month - 1);
      return monthsSinceAnchor % interval === 0 && anchor.day === dayOfMonth;
    }
    case 'yearly': {
      if (!anchor) return false;
      const yearsSinceAnchor = dayKey.getUTCFullYear() - anchor.year;
      return (
        yearsSinceAnchor % interval === 0 && anchor.day === dayOfMonth && anchor.month - 1 === month
      );
    }
    default:
      return false;
  }
}

/** Count scheduled occurrences of a recurrence over an inclusive day-key range (for streak %). */
export function countScheduledInRange(
  recurrence: Recurrence,
  fromDayKey: Date,
  toDayKey: Date,
  anchor?: DayParts | null
): number {
  let count = 0;
  for (let d = fromDayKey; d.getTime() <= toDayKey.getTime(); d = addDaysToDayKey(d, 1)) {
    if (isScheduledOn(recurrence, d, anchor)) count += 1;
  }
  return count;
}
