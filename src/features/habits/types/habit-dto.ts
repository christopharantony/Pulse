import type { RecurrenceDto } from '@/features/tasks/types/task-dto';
import type { HabitType, HabitStreakUnit } from '@/features/habits/types/habit';
import type { HabitLogStatus } from '@/features/habits/types/habit-log';

/**
 * Habit API contracts — the serialized (JSON-safe) shapes routes return and the client consumes.
 * All ids and dates are strings here (never `ObjectId`/`Date`), mirroring Task's domain-vs-DTO
 * split. One flat DTO (not a list/detail split like Task's) — Habit has no heavy embedded content
 * (no subtask tree, no notes) to justify a lighter list shape.
 */

export interface HabitChecklistItemDto {
  id: string;
  name: string;
  order: number;
}

export interface HabitReminderDto {
  timeOfDay: string;
  enabled: boolean;
}

/** The resolved state of "today" for this habit — `null` means not scheduled today. */
export type HabitDayStateDto = HabitLogStatus | 'pending' | null;

export interface HabitTodayContextDto {
  scheduledToday: boolean;
  state: HabitDayStateDto;
  /** 0-100, today's progress toward the day's target (100 for a satisfied boolean day). */
  progressToday: number;
  valueToday: number | null;
  checkedItemIdsToday: string[] | null;
}

export interface HabitDto {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  category: string | null;

  type: HabitType;
  recurrence: RecurrenceDto;
  specificDates: string[] | null;
  startDate: string | null;
  endDate: string | null;
  targetPerPeriod: number | null;

  targetValue: number | null;
  unit: string | null;
  checklistItems: HabitChecklistItemDto[] | null;

  reminders: HabitReminderDto[];

  currentStreak: number;
  longestStreak: number;
  streakUnit: HabitStreakUnit;
  consistencyScore: number;

  today: HabitTodayContextDto;

  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCalendarDayDto {
  dateISO: string;
  state: HabitDayStateDto;
  progressPct: number;
  value: number | null;
  checkedItemIds: string[] | null;
}

export interface HabitCalendarDto {
  habitId: string;
  from: string;
  to: string;
  days: HabitCalendarDayDto[];
}

export interface HabitStatisticsDto {
  todayScore: number;
  weeklyScore: number;
  monthlyScore: number;
  totalCompletions: number;
  totalSkipped: number;
  totalMissed: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  streakUnit: HabitStreakUnit;
  consistencyScore: number;
  totalMinutes: number | null;
  totalQuantity: number | null;
  bestWeek: { weekStartISO: string; satisfiedCount: number } | null;
  bestMonth: { month: string; completionPct: number } | null;
}
