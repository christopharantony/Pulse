import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import type { Habit } from '@/features/habits/types/habit';
import type { HabitLog } from '@/features/habits/types/habit-log';
import type { HabitSummaryData, HabitTodayItem } from '@/features/dashboard/types/dashboard';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { addDaysToDayKey, zonedDayKey, zonedDayParts, type DayParts } from '@/lib/time/day';
import { isScheduledOn } from '@/lib/time/recurrence';

/**
 * All live (non-deleted, non-archived) habits in a workspace. Exported so the statistics/metrics
 * aggregator reuses the exact same "active habit" definition instead of re-deriving it.
 */
export async function loadActiveHabits(workspaceId: ObjectId): Promise<Habit[]> {
  const collection = await habitsRepository.collection();
  return collection
    .find({ workspaceId, deletedAt: null, archivedAt: null } as Filter<Habit>)
    .toArray() as Promise<Habit[]>;
}

/** The habit's creation day as calendar parts — the anchor for monthly/yearly schedules. */
function habitAnchor(habit: Habit, timezone: string): DayParts {
  return zonedDayParts(habit.createdAt, timezone);
}

function frequencyLabel(habit: Habit): string {
  const { recurrence, targetPerPeriod } = habit;
  if (targetPerPeriod && recurrence.frequency === 'weekly') return `${targetPerPeriod}× / week`;
  switch (recurrence.frequency) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'One-off';
  }
}

/** Start-of-week day key for the week containing `todayKey`, honoring the workspace week-start. */
function weekStartKey(todayKey: Date, weekStartsOn: number): Date {
  const diff = (todayKey.getUTCDay() - weekStartsOn + 7) % 7;
  return addDaysToDayKey(todayKey, -diff);
}

/**
 * "Today's Habits": the habits scheduled today, each with its streak, this-period completion %, and
 * whether it's already done today. A single week-range read of `habit_logs` backs the completion
 * math (no per-habit query), keeping the section O(1) in queries regardless of habit count.
 */
export async function buildHabitSummary(ctx: WorkspaceContext): Promise<HabitSummaryData> {
  const now = new Date();
  const todayKey = zonedDayKey(now, ctx.timezone);
  const fromKey = weekStartKey(todayKey, ctx.weekStartsOn);

  const habits = await loadActiveHabits(ctx.workspaceId);
  const scheduled = habits.filter((h) =>
    isScheduledOn(h.recurrence, todayKey, habitAnchor(h, ctx.timezone))
  );

  const logsCollection = await habitLogsRepository.collection();
  const logs = (await logsCollection
    .find({
      workspaceId: ctx.workspaceId,
      status: 'completed',
      date: { $gte: fromKey, $lte: todayKey },
    } as Filter<HabitLog>)
    .toArray()) as HabitLog[];

  // Map habitId → set of completed day-key timestamps this week.
  const completedByHabit = new Map<string, Set<number>>();
  for (const log of logs) {
    const id = log.habitId.toHexString();
    const set = completedByHabit.get(id) ?? new Set<number>();
    set.add(log.date.getTime());
    completedByHabit.set(id, set);
  }

  const items: HabitTodayItem[] = scheduled.map((habit) => {
    const done = completedByHabit.get(habit._id.toHexString()) ?? new Set<number>();
    const completedToday = done.has(todayKey.getTime());
    const completedThisPeriod = done.size;
    const completionPct = habit.targetPerPeriod
      ? Math.min(100, Math.round((completedThisPeriod / habit.targetPerPeriod) * 100))
      : completedToday
        ? 100
        : 0;

    return {
      id: habit._id.toHexString(),
      name: habit.name,
      color: habit.color,
      frequencyLabel: frequencyLabel(habit),
      currentStreak: habit.currentStreak,
      completionPct,
      completedToday,
      nextReminder: null,
    };
  });

  const completedCount = items.filter((i) => i.completedToday).length;
  return { items, completedCount, totalCount: items.length };
}
