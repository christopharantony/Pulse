import 'server-only';
import { type Filter } from 'mongodb';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { Task } from '@/features/tasks/types/task';
import { calendarRepository } from '@/features/calendar/repositories/calendar.repository';
import type { CalendarEvent } from '@/features/calendar/types/calendar-event';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import type { Goal } from '@/features/goals/types/goal';
import { loadActiveHabits } from '@/features/dashboard/services/habits.aggregator';
import type {
  CalendarDay,
  CalendarIndicator,
  CalendarPreviewData,
} from '@/features/dashboard/types/dashboard';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { isHabitScheduledOn, habitAnchor } from '@/features/habits/services/habit-schedule';
import { addDaysToDayKey, zonedDayKey, zonedDayParts } from '@/lib/time/day';

const INDICATOR_COLOR = {
  task: 'accent',
  habit: 'success',
  event: 'secondary',
  milestone: 'warning',
} as const;

/** Parse a `YYYY-MM` param into a {year, month(1-based)}, or fall back to the current tz month. */
function resolveMonth(monthParam: string | undefined, timezone: string): { year: number; month: number } {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split('-').map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const { year, month } = zonedDayParts(new Date(), timezone);
  return { year, month };
}

/**
 * A 6-week month grid (leading/trailing days from adjacent months included) with per-day indicator
 * dots for task due dates, scheduled habits, calendar events, and goal milestones. Instant-valued
 * data is fetched over a padded UTC window and bucketed by tz day-key; habit schedules are expanded
 * in app code over the bounded grid — never an unbounded recurrence query.
 */
export async function buildCalendarPreview(
  ctx: WorkspaceContext,
  monthParam?: string
): Promise<CalendarPreviewData> {
  const { year, month } = resolveMonth(monthParam, ctx.timezone);
  const monthStartKey = new Date(Date.UTC(year, month - 1, 1));
  const monthEndKey = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day

  // Grid start: back up to the week-start; grid end: 42 cells (6 weeks) for a stable layout.
  const leading = (monthStartKey.getUTCDay() - ctx.weekStartsOn + 7) % 7;
  const gridStartKey = addDaysToDayKey(monthStartKey, -leading);
  const GRID_CELLS = 42;

  const days: CalendarDay[] = [];
  const cellByDay = new Map<number, CalendarDay>();
  const todayKey = zonedDayKey(new Date(), ctx.timezone);

  for (let i = 0; i < GRID_CELLS; i++) {
    const dayKey = addDaysToDayKey(gridStartKey, i);
    const parts = { year: dayKey.getUTCFullYear(), month: dayKey.getUTCMonth() + 1, day: dayKey.getUTCDate() };
    const cell: CalendarDay = {
      dateISO: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
      isToday: dayKey.getTime() === todayKey.getTime(),
      inMonth: parts.month === month && parts.year === year,
      indicators: [],
    };
    days.push(cell);
    cellByDay.set(dayKey.getTime(), cell);
  }

  // Padded UTC window covering the grid (±1 day absorbs tz shift when bucketing by day-key).
  const from = addDaysToDayKey(gridStartKey, -1);
  const to = addDaysToDayKey(gridStartKey, GRID_CELLS + 1);

  const [tasksColl, eventsColl, goalsColl, habits] = await Promise.all([
    tasksRepository.collection(),
    calendarRepository.collection(),
    goalsRepository.collection(),
    loadActiveHabits(ctx.workspaceId),
  ]);

  const [tasks, events, goals] = await Promise.all([
    tasksColl
      .find({ workspaceId: ctx.workspaceId, deletedAt: null, dueDate: { $gte: from, $lt: to } } as Filter<Task>)
      .project({ dueDate: 1 })
      .toArray(),
    eventsColl
      .find({ workspaceId: ctx.workspaceId, deletedAt: null, startsAt: { $gte: from, $lt: to } } as Filter<CalendarEvent>)
      .project({ startsAt: 1 })
      .toArray(),
    goalsColl
      .find({ workspaceId: ctx.workspaceId, deletedAt: null, targetDate: { $gte: from, $lt: to } } as Filter<Goal>)
      .project({ targetDate: 1 })
      .toArray(),
  ]);

  const counts = new Map<number, { task: number; habit: number; event: number; milestone: number }>();
  const bump = (instant: Date, kind: 'task' | 'habit' | 'event' | 'milestone') => {
    const key = zonedDayKey(instant, ctx.timezone).getTime();
    if (!cellByDay.has(key)) return;
    const entry = counts.get(key) ?? { task: 0, habit: 0, event: 0, milestone: 0 };
    entry[kind] += 1;
    counts.set(key, entry);
  };

  for (const t of tasks as Pick<Task, 'dueDate'>[]) if (t.dueDate) bump(t.dueDate, 'task');
  for (const e of events as Pick<CalendarEvent, 'startsAt'>[]) bump(e.startsAt, 'event');
  for (const g of goals as Pick<Goal, 'targetDate'>[]) if (g.targetDate) bump(g.targetDate, 'milestone');

  // Habit schedules: expand each active habit across the grid days (bounded loop).
  for (const habit of habits) {
    const anchor = habitAnchor(habit, ctx.timezone);
    for (const [dayTime] of cellByDay) {
      if (isHabitScheduledOn(habit, new Date(dayTime), anchor)) {
        const entry = counts.get(dayTime) ?? { task: 0, habit: 0, event: 0, milestone: 0 };
        entry.habit += 1;
        counts.set(dayTime, entry);
      }
    }
  }

  for (const [dayTime, cell] of cellByDay) {
    const entry = counts.get(dayTime);
    if (!entry) continue;
    const indicators: CalendarIndicator[] = [];
    if (entry.task) indicators.push({ type: 'task', count: entry.task, color: INDICATOR_COLOR.task });
    if (entry.habit) indicators.push({ type: 'habit', count: entry.habit, color: INDICATOR_COLOR.habit });
    if (entry.event) indicators.push({ type: 'event', count: entry.event, color: INDICATOR_COLOR.event });
    if (entry.milestone)
      indicators.push({ type: 'milestone', count: entry.milestone, color: INDICATOR_COLOR.milestone });
    cell.indicators = indicators;
  }

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    weekStartsOn: ctx.weekStartsOn,
    days,
  };
}
