import type { Recurrence } from '@/schemas/schedulable.schema';

/**
 * Pure recurrence-engine functions — no I/O. A recurring Task uses the "rolling single document"
 * pattern (Todoist-style): one Task doc represents the whole series, and on completion the service
 * layer calls `computeNextDueDate` to roll `dueDate` forward and resets `status`/`completedAt` on
 * the same document, rather than inserting new task documents per occurrence.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  // Clamp to the last day of the target month (e.g. Jan 31 + 1 month -> Feb 28, not Mar 3).
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInTargetMonth));
  return result;
}

function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/** Next date on/after `from` (exclusive) whose weekday is in `daysOfWeek` (0=Sun..6=Sat). */
function nextMatchingWeekday(from: Date, daysOfWeek: number[]): Date {
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(from, offset);
    if (sorted.includes(candidate.getDay())) return candidate;
  }
  // Unreachable when daysOfWeek is non-empty, but keep a safe fallback.
  return addDays(from, 1);
}

/**
 * Compute the single next occurrence after `base` for one `interval` step of `frequency`.
 * `base` is the anchor date — the original due date for `fixed` behavior, or the actual
 * completion timestamp for `rolling` behavior (the caller picks which to pass in).
 */
function stepOnce(base: Date, recurrence: Recurrence): Date {
  const interval = recurrence.interval ?? 1;
  switch (recurrence.frequency) {
    case 'daily':
      return addDays(base, interval);
    case 'weekly':
      if (recurrence.daysOfWeek?.length) {
        // Weekly + daysOfWeek covers both "every Monday" and "weekdays" (daysOfWeek=[1,2,3,4,5]).
        // `interval` beyond 1 skips whole weeks between matches, applied as extra day-jumps.
        let next = nextMatchingWeekday(base, recurrence.daysOfWeek);
        if (interval > 1) next = addDays(next, (interval - 1) * 7);
        return next;
      }
      return addDays(base, interval * 7);
    case 'monthly':
      return addMonths(base, interval);
    case 'yearly':
      return addYears(base, interval);
    case 'none':
    default:
      return base;
  }
}

/**
 * Compute the next due date for a recurring task after it was completed.
 *
 * `completionBehavior: 'fixed'` (default) anchors on the original due date (`currentDueDate`)
 * regardless of how late the task was actually completed — this is the "missed recurrence" policy:
 * a fixed daily task due Monday, completed Wednesday, becomes due Tuesday (the next fixed slot
 * after Monday), not "Wednesday + 1 day." This prevents recurrence drift from a single missed day.
 *
 * `completionBehavior: 'rolling'` anchors on `completedAt` instead — the next occurrence
 * intentionally shifts with when the task was actually completed (e.g. "3 days after I actually
 * water the plant").
 */
export function computeNextDueDate(
  currentDueDate: Date,
  recurrence: Recurrence,
  completedAt: Date
): Date {
  const anchor = recurrence.completionBehavior === 'rolling' ? completedAt : currentDueDate;
  return stepOnce(anchor, recurrence);
}

/** Whether a recurrence series has ended as of `asOf` (its `endDate` has passed). */
export function isExpired(recurrence: Recurrence, asOf: Date = new Date()): boolean {
  if (!recurrence.endDate) return false;
  return asOf.getTime() > new Date(recurrence.endDate).getTime();
}
