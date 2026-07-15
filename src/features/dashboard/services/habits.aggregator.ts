import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import type { Habit } from '@/features/habits/types/habit';
import type { HabitLog } from '@/features/habits/types/habit-log';
import type { HabitSummaryData, HabitTodayItem } from '@/features/dashboard/types/dashboard';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { addDaysToDayKey, zonedDayKey } from '@/lib/time/day';
import { isDaySatisfied, isHabitScheduledOn, habitAnchor, progressPct } from '@/features/habits/services/habit-schedule';

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

function frequencyLabel(habit: Habit): string {
  const { recurrence, targetPerPeriod } = habit;
  if (habit.specificDates?.length) return 'Specific dates';
  if (targetPerPeriod && recurrence.frequency === 'weekly') return `${targetPerPeriod}× / week`;
  const interval = recurrence.interval ?? 1;
  switch (recurrence.frequency) {
    case 'daily':
      return interval > 1 ? `Every ${interval} days` : 'Daily';
    case 'weekly':
      if (recurrence.daysOfWeek?.length === 5 && [1, 2, 3, 4, 5].every((d) => recurrence.daysOfWeek!.includes(d))) {
        return 'Weekdays';
      }
      if (recurrence.daysOfWeek?.length === 2 && [0, 6].every((d) => recurrence.daysOfWeek!.includes(d))) {
        return 'Weekends';
      }
      return interval > 1 ? `Every ${interval} weeks` : 'Weekly';
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
 * math (no per-habit query), keeping the section O(1) in queries regardless of habit count. Every
 * habit type's "satisfied" definition is the log's stored `status` — the repository layer already
 * computes `status: 'completed'` at write time using the same `isDaySatisfied` rule (value >=
 * target, or all checklist items checked), so this aggregator never needs to special-case type.
 */
export async function buildHabitSummary(ctx: WorkspaceContext): Promise<HabitSummaryData> {
  const now = new Date();
  const todayKey = zonedDayKey(now, ctx.timezone);
  const fromKey = weekStartKey(todayKey, ctx.weekStartsOn);

  const habits = await loadActiveHabits(ctx.workspaceId);
  const scheduled = habits.filter((h) => isHabitScheduledOn(h, todayKey, habitAnchor(h, ctx.timezone)));

  const logsCollection = await habitLogsRepository.collection();
  const logs = (await logsCollection
    .find({
      workspaceId: ctx.workspaceId,
      date: { $gte: fromKey, $lte: todayKey },
    } as Filter<HabitLog>)
    .toArray()) as HabitLog[];

  // Map habitId → set of satisfied day-key timestamps this week, and habitId → today's own log.
  const satisfiedByHabit = new Map<string, Set<number>>();
  const todayLogByHabit = new Map<string, HabitLog>();
  for (const log of logs) {
    const id = log.habitId.toHexString();
    if (log.date.getTime() === todayKey.getTime()) todayLogByHabit.set(id, log);
    if (log.status === 'completed') {
      const set = satisfiedByHabit.get(id) ?? new Set<number>();
      set.add(log.date.getTime());
      satisfiedByHabit.set(id, set);
    }
  }

  const items: HabitTodayItem[] = scheduled.map((habit) => {
    const id = habit._id.toHexString();
    const done = satisfiedByHabit.get(id) ?? new Set<number>();
    const completedToday = done.has(todayKey.getTime());
    const completedThisPeriod = done.size;
    const completionPct = habit.targetPerPeriod
      ? Math.min(100, Math.round((completedThisPeriod / habit.targetPerPeriod) * 100))
      : completedToday
        ? 100
        : 0;
    const todayLog = todayLogByHabit.get(id) ?? null;

    return {
      id,
      name: habit.name,
      color: habit.color,
      icon: habit.icon,
      type: habit.type,
      unit: habit.unit,
      frequencyLabel: frequencyLabel(habit),
      currentStreak: habit.currentStreak,
      completionPct,
      progressToday: isDaySatisfied(habit, todayLog) ? 100 : progressPct(habit, todayLog),
      completedToday,
      nextReminder: habit.reminders.find((r) => r.enabled)?.timeOfDay ?? null,
    };
  });

  const completedCount = items.filter((i) => i.completedToday).length;
  return { items, completedCount, totalCount: items.length };
}
