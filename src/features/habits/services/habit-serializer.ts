import 'server-only';
import type { Habit } from '@/features/habits/types/habit';
import type { HabitLog } from '@/features/habits/types/habit-log';
import type {
  HabitCalendarDayDto,
  HabitDto,
  HabitTodayContextDto,
} from '@/features/habits/types/habit-dto';
import {
  isHabitScheduledOn,
  progressPct,
  resolveDayState,
  toDayKey,
} from '@/features/habits/services/habit-schedule';
import { toISODate, type DayParts } from '@/lib/time/day';

/** Today's scheduling/progress context for a habit — used by both the list DTO and the dashboard. */
export function computeTodayContext(
  habit: Habit,
  log: HabitLog | null,
  todayKey: Date,
  anchor: DayParts
): HabitTodayContextDto {
  const scheduledToday = isHabitScheduledOn(habit, todayKey, anchor);
  return {
    scheduledToday,
    state: scheduledToday ? resolveDayState(habit, log, todayKey, todayKey, anchor) : null,
    progressToday: progressPct(habit, log),
    valueToday: log?.value ?? null,
    checkedItemIdsToday: log?.checkedItemIds ?? null,
  };
}

export function serializeHabit(habit: Habit, today: HabitTodayContextDto): HabitDto {
  return {
    id: habit._id.toHexString(),
    name: habit.name,
    description: habit.description,
    color: habit.color,
    icon: habit.icon,
    category: habit.category,

    type: habit.type,
    recurrence: {
      frequency: habit.recurrence.frequency,
      interval: habit.recurrence.interval,
      daysOfWeek: habit.recurrence.daysOfWeek,
      endDate: habit.recurrence.endDate ? new Date(habit.recurrence.endDate).toISOString() : null,
      completionBehavior: habit.recurrence.completionBehavior ?? 'fixed',
    },
    specificDates: habit.specificDates ? habit.specificDates.map((d) => d.toISOString()) : null,
    startDate: habit.startDate ? habit.startDate.toISOString() : null,
    endDate: habit.endDate ? habit.endDate.toISOString() : null,
    targetPerPeriod: habit.targetPerPeriod,

    targetValue: habit.targetValue,
    unit: habit.unit,
    checklistItems: habit.checklistItems,

    reminders: habit.reminders,

    currentStreak: habit.currentStreak,
    longestStreak: habit.longestStreak,
    streakUnit: habit.streakUnit,
    consistencyScore: habit.consistencyScore,

    today,

    archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}

export function serializeCalendarDay(
  habit: Habit,
  log: HabitLog | null,
  day: Date,
  todayKey: Date,
  anchor: DayParts
): HabitCalendarDayDto | null {
  const state = resolveDayState(habit, log, day, todayKey, anchor);
  if (state === null && !isHabitScheduledOn(habit, day, anchor)) return null;
  const parts: DayParts = { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() };
  return {
    dateISO: toISODate(parts),
    state,
    progressPct: progressPct(habit, log),
    value: log?.value ?? null,
    checkedItemIds: log?.checkedItemIds ?? null,
  };
}

export { toDayKey };
