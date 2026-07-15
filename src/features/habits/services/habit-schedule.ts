import 'server-only';
import type { Habit } from '@/features/habits/types/habit';
import type { HabitLog, HabitLogStatus } from '@/features/habits/types/habit-log';
import { isScheduledOn } from '@/lib/time/recurrence';
import { zonedDayParts, type DayParts } from '@/lib/time/day';

/** Normalise a date to midnight UTC — the canonical day-key, matching `habitLogsRepository.toDayKey`. */
export function toDayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * The habit's scheduling/streak anchor, as calendar parts in the workspace timezone. Anchored on
 * `startDate` when set (a habit scheduled to "start next Monday" anchors from there), falling back
 * to `createdAt`.
 */
export function habitAnchor(habit: Habit, timezone: string): DayParts {
  return zonedDayParts(habit.startDate ?? habit.createdAt, timezone);
}

/**
 * A `targetPerPeriod` habit ("3x/week") with no explicit `daysOfWeek` means "any day counts" —
 * every day is eligible, and the target is what constrains it, not the day selection. Without this
 * exemption, `isScheduledOn`'s empty-`daysOfWeek` default (the anchor's single weekday — a fix for
 * ordinary weekly habits, see recurrence.ts) would make a period-target habit schedulable on only
 * one day a week, so a "3x/week" target could never be reached.
 */
function isPeriodTargetWithoutExplicitDays(habit: Habit): boolean {
  return (
    habit.targetPerPeriod != null &&
    habit.recurrence.frequency === 'weekly' &&
    (!habit.recurrence.daysOfWeek || habit.recurrence.daysOfWeek.length === 0)
  );
}

/**
 * Whether a habit is scheduled on a given day. `specificDates`, when non-empty, is a set-membership
 * test that overrides `recurrence` entirely — deliberately kept Habit-local rather than folded into
 * the shared `recurrenceSchema`/`isScheduledOn` (schedulable.schema.ts), since "an arbitrary set of
 * dates" is not a repeating rule and Task/Goal/CalendarEvent don't need it.
 */
export function isHabitScheduledOn(habit: Habit, dayKey: Date, anchor: DayParts): boolean {
  if (habit.endDate && dayKey.getTime() > toDayKey(habit.endDate).getTime()) return false;
  if (habit.specificDates && habit.specificDates.length > 0) {
    const target = dayKey.getTime();
    return habit.specificDates.some((d) => toDayKey(d).getTime() === target);
  }
  if (isPeriodTargetWithoutExplicitDays(habit)) {
    const anchorDayKey = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day));
    return dayKey.getTime() >= anchorDayKey.getTime();
  }
  return isScheduledOn(habit.recurrence, dayKey, anchor);
}

/**
 * Count of scheduled days for a habit over an inclusive day-key range — honors `specificDates` and
 * the period-target exemption above. Delegates to `isHabitScheduledOn` per day (not the shared
 * `countScheduledInRange`) so the two functions can never disagree on what counts as scheduled.
 */
export function countHabitScheduledInRange(
  habit: Habit,
  fromDayKey: Date,
  toDayKeyInclusive: Date,
  anchor: DayParts
): number {
  let count = 0;
  for (let d = fromDayKey; d.getTime() <= toDayKeyInclusive.getTime(); d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    if (isHabitScheduledOn(habit, d, anchor)) count += 1;
  }
  return count;
}

/** Whether a given day's log satisfies the habit — the single definition every algorithm reuses. */
export function isDaySatisfied(habit: Habit, log: HabitLog | null | undefined): boolean {
  if (!log) return false;
  switch (habit.type) {
    case 'boolean':
      return log.status === 'completed';
    case 'numeric':
    case 'duration':
      return log.value != null && habit.targetValue != null && log.value >= habit.targetValue;
    case 'checklist': {
      const total = habit.checklistItems?.length ?? 0;
      return total > 0 && (log.checkedItemIds?.length ?? 0) === total;
    }
    default:
      return false;
  }
}

/** 0-100 progress toward today's target, for partial-progress UI (numeric/duration/checklist). */
export function progressPct(habit: Habit, log: HabitLog | null | undefined): number {
  if (!log) return 0;
  if (habit.type === 'numeric' || habit.type === 'duration') {
    if (log.value == null || !habit.targetValue) return 0;
    return Math.max(0, Math.min(100, Math.round((log.value / habit.targetValue) * 100)));
  }
  if (habit.type === 'checklist') {
    const total = habit.checklistItems?.length ?? 0;
    if (total === 0) return 0;
    return Math.max(
      0,
      Math.min(100, Math.round(((log.checkedItemIds?.length ?? 0) / total) * 100))
    );
  }
  return log.status === 'completed' ? 100 : 0;
}

export type ResolvedDayState = HabitLogStatus | 'pending' | null;

/**
 * The day-state a calendar/heatmap cell should render. `null` means "don't render this day" (not
 * scheduled). `'missed'` is derived here, never stored — see the architecture doc's decision to
 * avoid a materialisation job for Phase 8 (no log, scheduled, day has elapsed).
 */
export function resolveDayState(
  habit: Habit,
  log: HabitLog | null | undefined,
  day: Date,
  todayKey: Date,
  anchor: DayParts
): ResolvedDayState {
  if (!isHabitScheduledOn(habit, day, anchor)) return null;
  if (log) return log.status;
  if (day.getTime() === todayKey.getTime()) return 'pending';
  if (day.getTime() > todayKey.getTime()) return null;
  return 'missed';
}
