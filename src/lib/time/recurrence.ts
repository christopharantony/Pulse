import type { Recurrence } from '@/schemas/schedulable.schema';
import { addDaysToDayKey, type DayParts } from '@/lib/time/day';

/**
 * Whether a recurrence is "scheduled" on a given calendar day. Used to decide which habits appear in
 * "Today's Habits" and to expand a habit schedule across the calendar-preview month.
 *
 * Deliberately pragmatic for the dashboard's read-only needs (it is not a full RRULE engine):
 *  - `daily` — every day.
 *  - `weekly` — days named in `daysOfWeek`; if none are named, treated as scheduled (show it).
 *  - `monthly` / `yearly` — matched against an `anchor` day (the habit's creation day) so a
 *    monthly habit surfaces on the same day-of-month it started.
 *  - `none` — never scheduled.
 * `endDate` (when set) closes the schedule.
 */
export function isScheduledOn(
  recurrence: Recurrence,
  dayKey: Date,
  anchor?: DayParts | null
): boolean {
  if (recurrence.endDate && dayKey.getTime() > new Date(recurrence.endDate).getTime()) {
    return false;
  }

  const weekday = dayKey.getUTCDay(); // 0=Sunday..6=Saturday
  const dayOfMonth = dayKey.getUTCDate();
  const month = dayKey.getUTCMonth();

  switch (recurrence.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      if (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0) return true;
      return recurrence.daysOfWeek.includes(weekday);
    case 'monthly':
      return anchor ? anchor.day === dayOfMonth : false;
    case 'yearly':
      return anchor ? anchor.day === dayOfMonth && anchor.month - 1 === month : false;
    case 'none':
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
