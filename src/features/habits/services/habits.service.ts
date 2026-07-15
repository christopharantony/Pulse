import 'server-only';
import { type ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import type { Habit } from '@/features/habits/types/habit';
import type { HabitLog } from '@/features/habits/types/habit-log';
import type {
  CreateHabitInput,
  HabitListQueryInput,
  LogHabitInput,
  StartHabitTimerInput,
  UpdateHabitInput,
} from '@/features/habits/validators/habits.schema';
import type {
  HabitCalendarDto,
  HabitDto,
  HabitStatisticsDto,
} from '@/features/habits/types/habit-dto';
import { computeTodayContext, serializeCalendarDay, serializeHabit } from '@/features/habits/services/habit-serializer';
import {
  countHabitScheduledInRange,
  habitAnchor,
  isDaySatisfied,
  isHabitScheduledOn,
  toDayKey,
} from '@/features/habits/services/habit-schedule';
import {
  MAX_RECOMPUTE_WINDOW_DAYS,
  recomputePeriodStreak,
  recomputeStreakFull,
  recomputeStreakIncremental,
} from '@/features/habits/services/streak';
import {
  startTimerForSource,
  stopTimer,
  type StartTimerResult,
  type StopTimerResult,
} from '@/features/time-tracking/services/time-tracking.service';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';
import { clampLimit } from '@/lib/query/pagination';
import type { OffsetResult } from '@/lib/query/offset';
import { zonedDayKey, zonedDayParts, dayKeyMonthRange } from '@/lib/time/day';

export class HabitError extends AppError {
  constructor(
    message: string,
    code:
      | 'HABIT_NOT_FOUND'
      | 'HABIT_NOT_IN_TRASH'
      | 'INVALID_HABIT_TYPE'
      | 'INVALID_LOG_INPUT'
      | 'NOT_A_DURATION_HABIT',
    status: number
  ) {
    super(message, code, status);
  }
}

function notFound(): never {
  throw new HabitError('Habit not found', 'HABIT_NOT_FOUND', 404);
}

/** Load a habit and verify it belongs to the caller's workspace, or throw 404. */
async function getOwnedHabit(
  ctx: WorkspaceContext,
  id: ObjectId,
  opts?: { includeDeleted?: boolean }
): Promise<Habit> {
  const habit = await habitsRepository.findById(id, opts);
  if (!habit || !habit.workspaceId.equals(ctx.workspaceId)) notFound();
  return habit;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function boundedWindowStart(habit: Habit, todayKey: Date): Date {
  const habitStart = toDayKey(habit.startDate ?? habit.createdAt);
  const bound = new Date(todayKey.getTime() - MAX_RECOMPUTE_WINDOW_DAYS * MS_PER_DAY);
  return habitStart.getTime() > bound.getTime() ? habitStart : bound;
}

/** Assemble the client-facing DTO for a habit, including today's scheduling/progress context. */
async function toHabitDto(ctx: WorkspaceContext, habit: Habit): Promise<HabitDto> {
  const todayKey = zonedDayKey(new Date(), ctx.timezone);
  const anchor = habitAnchor(habit, ctx.timezone);
  const log = await habitLogsRepository.findForDay(habit._id, todayKey);
  return serializeHabit(habit, computeTodayContext(habit, log, todayKey, anchor));
}

/**
 * Recompute and persist the habit's streak cache after a log change. Dispatches to the incremental
 * (zero-read) path for a same-or-newer-day day-based log, the period walk for `targetPerPeriod`
 * habits, or the bounded full recompute for edits to a past day — see streak.ts for the algorithms.
 */
async function recomputeStreak(ctx: WorkspaceContext, habit: Habit, loggedDayKey: Date, log: HabitLog | null): Promise<Habit> {
  const anchor = habitAnchor(habit, ctx.timezone);
  const todayKey = zonedDayKey(new Date(), ctx.timezone);
  const windowStart = boundedWindowStart(habit, todayKey);

  if (habit.targetPerPeriod != null) {
    const logs = await habitLogsRepository.listForRange(habit._id, windowStart, todayKey);
    const patch = recomputePeriodStreak(habit, logs, windowStart, todayKey, anchor);
    return (await habitsRepository.applyStreakCache(habit._id, patch)) ?? habit;
  }

  const isNewer = habit.lastLoggedDayKey == null || loggedDayKey.getTime() > habit.lastLoggedDayKey.getTime();
  if (isNewer) {
    const satisfied = isDaySatisfied(habit, log);
    const patch = recomputeStreakIncremental(habit, loggedDayKey, satisfied, anchor);
    return (await habitsRepository.applyStreakCache(habit._id, patch)) ?? habit;
  }

  const logs = await habitLogsRepository.listForRange(habit._id, windowStart, todayKey);
  const patch = recomputeStreakFull(habit, logs, windowStart, todayKey, anchor);
  return (await habitsRepository.applyStreakCache(habit._id, patch)) ?? habit;
}

// --- CRUD ---------------------------------------------------------------------------------------

export async function createHabit(ctx: WorkspaceContext, input: CreateHabitInput): Promise<HabitDto> {
  const habit = await habitsRepository.create(ctx.workspaceId, ctx.userId, {
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    category: input.category ?? null,
    type: input.type,
    recurrence: input.recurrence,
    specificDates: input.specificDates ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    targetPerPeriod: input.targetPerPeriod ?? null,
    targetValue: input.targetValue ?? null,
    unit: input.unit ?? null,
    checklistItems: input.checklistItems ?? null,
    reminders: input.reminders ?? [],
  });
  return toHabitDto(ctx, habit);
}

export async function getHabitDetail(ctx: WorkspaceContext, id: ObjectId): Promise<HabitDto> {
  const habit = await getOwnedHabit(ctx, id, { includeDeleted: true });
  return toHabitDto(ctx, habit);
}

async function applyPatch(id: ObjectId, input: UpdateHabitInput): Promise<Habit> {
  const patch: Partial<Habit> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.color !== undefined) patch.color = input.color ?? null;
  if (input.icon !== undefined) patch.icon = input.icon ?? null;
  if (input.category !== undefined) patch.category = input.category ?? null;
  if (input.recurrence !== undefined) patch.recurrence = input.recurrence;
  if (input.specificDates !== undefined) patch.specificDates = input.specificDates ?? null;
  if (input.startDate !== undefined) patch.startDate = input.startDate ?? null;
  if (input.endDate !== undefined) patch.endDate = input.endDate ?? null;
  if (input.targetPerPeriod !== undefined) patch.targetPerPeriod = input.targetPerPeriod ?? null;
  if (input.targetValue !== undefined) patch.targetValue = input.targetValue ?? null;
  if (input.unit !== undefined) patch.unit = input.unit ?? null;
  if (input.checklistItems !== undefined) patch.checklistItems = input.checklistItems ?? null;
  if (input.reminders !== undefined) patch.reminders = input.reminders ?? [];

  const updated = await habitsRepository.updateById(id, patch);
  if (!updated) notFound();
  return updated;
}

/**
 * Update a habit. `type` is never patchable — `UpdateHabitInput` omits the field entirely at the
 * schema level, so there's nothing to ignore here. A schedule change (recurrence/specificDates/
 * startDate/endDate) invalidates the incremental streak cursor's assumptions about past gaps, so it
 * triggers a bounded full recompute rather than trusting the cache forward.
 */
export async function updateHabit(ctx: WorkspaceContext, id: ObjectId, input: UpdateHabitInput): Promise<HabitDto> {
  await getOwnedHabit(ctx, id);
  const updated = await applyPatch(id, input);

  const scheduleChanged =
    input.recurrence !== undefined ||
    input.specificDates !== undefined ||
    input.startDate !== undefined ||
    input.endDate !== undefined;
  if (!scheduleChanged) return toHabitDto(ctx, updated);

  const anchor = habitAnchor(updated, ctx.timezone);
  const todayKey = zonedDayKey(new Date(), ctx.timezone);
  const windowStart = boundedWindowStart(updated, todayKey);
  const logs = await habitLogsRepository.listForRange(updated._id, windowStart, todayKey);
  const patch =
    updated.targetPerPeriod != null
      ? recomputePeriodStreak(updated, logs, windowStart, todayKey, anchor)
      : recomputeStreakFull(updated, logs, windowStart, todayKey, anchor);
  const recomputed = (await habitsRepository.applyStreakCache(id, patch)) ?? updated;
  return toHabitDto(ctx, recomputed);
}

export async function deleteHabit(ctx: WorkspaceContext, id: ObjectId): Promise<void> {
  await getOwnedHabit(ctx, id);
  const ok = await habitsRepository.softDeleteById(id);
  if (!ok) notFound();
}

export async function restoreHabit(ctx: WorkspaceContext, id: ObjectId): Promise<HabitDto> {
  await getOwnedHabit(ctx, id, { includeDeleted: true });
  const restored = await habitsRepository.restore(id);
  if (!restored) notFound();
  return toHabitDto(ctx, restored);
}

export async function permanentlyDeleteHabit(ctx: WorkspaceContext, id: ObjectId): Promise<void> {
  const habit = await getOwnedHabit(ctx, id, { includeDeleted: true });
  if (!habit.deletedAt) {
    throw new HabitError('Habit must be trashed before it can be permanently deleted', 'HABIT_NOT_IN_TRASH', 409);
  }
  const ok = await habitsRepository.hardDeleteById(id);
  if (!ok) notFound();
}

export async function archiveHabit(ctx: WorkspaceContext, id: ObjectId): Promise<HabitDto> {
  await getOwnedHabit(ctx, id);
  const updated = await habitsRepository.setArchived(id, true);
  if (!updated) notFound();
  return toHabitDto(ctx, updated);
}

export async function unarchiveHabit(ctx: WorkspaceContext, id: ObjectId): Promise<HabitDto> {
  await getOwnedHabit(ctx, id);
  const updated = await habitsRepository.setArchived(id, false);
  if (!updated) notFound();
  return toHabitDto(ctx, updated);
}

// --- Daily logging --------------------------------------------------------------------------

/**
 * Log a day for a habit — dispatches by habit type (boolean: status; numeric/duration: value or
 * delta; checklist: checked-item set), then recomputes the streak cache. The generalised
 * replacement for the scaffold's `completeHabitToday`; `POST /api/habits/:id/complete` is kept as
 * a thin alias onto this with `status: 'completed'` so the shipped dashboard widget never breaks.
 */
export async function logHabitDay(ctx: WorkspaceContext, id: ObjectId, input: LogHabitInput): Promise<HabitDto> {
  const habit = await getOwnedHabit(ctx, id);
  const date = input.date ? toDayKey(input.date) : zonedDayKey(new Date(), ctx.timezone);

  let log: HabitLog | null;
  switch (habit.type) {
    case 'boolean': {
      log = await habitLogsRepository.upsertForDay({
        workspaceId: ctx.workspaceId,
        habitId: id,
        userId: ctx.userId,
        date,
        status: input.status ?? 'completed',
      });
      break;
    }
    case 'numeric':
    case 'duration': {
      if (habit.targetValue == null) {
        throw new HabitError('Habit has no target value', 'INVALID_HABIT_TYPE', 422);
      }
      if (input.status === 'skipped') {
        log = await habitLogsRepository.upsertForDay({
          workspaceId: ctx.workspaceId,
          habitId: id,
          userId: ctx.userId,
          date,
          status: 'skipped',
          value: input.value ?? 0,
        });
      } else if (input.value !== undefined) {
        log = await habitLogsRepository.setValueForDay({
          workspaceId: ctx.workspaceId,
          habitId: id,
          userId: ctx.userId,
          date,
          value: input.value,
          targetValue: habit.targetValue,
        });
      } else {
        log = await habitLogsRepository.incrementValueForDay({
          workspaceId: ctx.workspaceId,
          habitId: id,
          userId: ctx.userId,
          date,
          deltaValue: input.deltaValue ?? 1,
          targetValue: habit.targetValue,
        });
      }
      break;
    }
    case 'checklist': {
      if (!habit.checklistItems || habit.checklistItems.length === 0) {
        throw new HabitError('Habit has no checklist items', 'INVALID_HABIT_TYPE', 422);
      }
      if (input.status === 'skipped') {
        log = await habitLogsRepository.upsertForDay({
          workspaceId: ctx.workspaceId,
          habitId: id,
          userId: ctx.userId,
          date,
          status: 'skipped',
          checkedItemIds: input.checkedItemIds ?? [],
        });
      } else {
        if (input.checkedItemIds === undefined) {
          throw new HabitError('checkedItemIds is required for checklist habits', 'INVALID_LOG_INPUT', 422);
        }
        log = await habitLogsRepository.setCheckedItemsForDay({
          workspaceId: ctx.workspaceId,
          habitId: id,
          userId: ctx.userId,
          date,
          checkedItemIds: input.checkedItemIds,
          totalItems: habit.checklistItems.length,
        });
      }
      break;
    }
    default:
      throw new HabitError('Unknown habit type', 'INVALID_HABIT_TYPE', 422);
  }

  const updatedHabit = await recomputeStreak(ctx, habit, date, log);
  return toHabitDto(ctx, updatedHabit);
}

/** Thin alias kept for the shipped dashboard widget's optimistic mutation — see logHabitDay's doc. */
export async function completeHabitToday(ctx: WorkspaceContext, id: ObjectId): Promise<HabitDto> {
  return logHabitDay(ctx, id, { status: 'completed' });
}

/** Undo a day's log (default: today). Always safe — recomputeStreak re-derives from real data. */
export async function undoHabitLog(ctx: WorkspaceContext, id: ObjectId, date?: Date): Promise<HabitDto> {
  const habit = await getOwnedHabit(ctx, id);
  const day = date ? toDayKey(date) : zonedDayKey(new Date(), ctx.timezone);
  await habitLogsRepository.deleteForDay(id, day);
  const updatedHabit = await recomputeStreak(ctx, habit, day, null);
  return toHabitDto(ctx, updatedHabit);
}

// --- List / search / trash ------------------------------------------------------------------

export interface ListHabitsResult {
  items: HabitDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listHabits(ctx: WorkspaceContext, query: HabitListQueryInput): Promise<ListHabitsResult> {
  const result: OffsetResult<Habit> = await habitsRepository.listFiltered(
    ctx.workspaceId,
    {
      type: query.type,
      category: query.category,
      q: query.q,
      includeArchived: query.includeArchived,
      includeDeleted: query.includeDeleted,
    },
    { field: query.sortBy, direction: query.sortDir },
    { page: query.page, limit: query.limit }
  );

  const items = await Promise.all(result.items.map((habit) => toHabitDto(ctx, habit)));
  return { items, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages };
}

export async function searchHabits(ctx: WorkspaceContext, term: string, opts?: { limit?: number }): Promise<HabitDto[]> {
  const result = await listHabits(ctx, { q: term, limit: clampLimit(opts?.limit) });
  return result.items;
}

export async function listTrash(ctx: WorkspaceContext): Promise<HabitDto[]> {
  const habits = await habitsRepository.listTrash(ctx.workspaceId);
  return Promise.all(habits.map((habit) => toHabitDto(ctx, habit)));
}

// --- Calendar / statistics -------------------------------------------------------------------

export async function getHabitCalendar(
  ctx: WorkspaceContext,
  id: ObjectId,
  range: { from: Date; to: Date }
): Promise<HabitCalendarDto> {
  const habit = await getOwnedHabit(ctx, id, { includeDeleted: true });
  const anchor = habitAnchor(habit, ctx.timezone);
  const todayKey = zonedDayKey(new Date(), ctx.timezone);
  const from = toDayKey(range.from);
  const to = toDayKey(range.to);

  const logs = await habitLogsRepository.listForRange(id, from, to);
  const byDay = new Map(logs.map((log) => [toDayKey(log.date).getTime(), log]));

  const days = [];
  for (let day = from; day.getTime() <= to.getTime(); day = new Date(day.getTime() + MS_PER_DAY)) {
    const dto = serializeCalendarDay(habit, byDay.get(day.getTime()) ?? null, day, todayKey, anchor);
    if (dto) days.push(dto);
  }

  return { habitId: id.toHexString(), from: from.toISOString(), to: to.toISOString(), days };
}

export async function getHabitStatistics(ctx: WorkspaceContext, id: ObjectId): Promise<HabitStatisticsDto> {
  const habit = await getOwnedHabit(ctx, id, { includeDeleted: true });
  const anchor = habitAnchor(habit, ctx.timezone);
  const todayKey = zonedDayKey(new Date(), ctx.timezone);
  const windowStart = boundedWindowStart(habit, todayKey);

  const logs = await habitLogsRepository.listForRange(id, windowStart, todayKey);
  const byDay = new Map(logs.map((log) => [toDayKey(log.date).getTime(), log]));

  const weekStart = new Date(todayKey.getTime() - 6 * MS_PER_DAY);
  const { year, month } = zonedDayParts(new Date(), ctx.timezone);
  const { start: monthStart, end: monthEndExclusive } = dayKeyMonthRange(year, month);
  const monthEnd = new Date(Math.min(monthEndExclusive.getTime() - MS_PER_DAY, todayKey.getTime()));

  const scoreFor = (from: Date, to: Date): number => {
    const scheduled = countHabitScheduledInRange(habit, from, to, anchor);
    if (scheduled === 0) return 0;
    let satisfied = 0;
    for (let day = from; day.getTime() <= to.getTime(); day = new Date(day.getTime() + MS_PER_DAY)) {
      if (isHabitScheduledOn(habit, day, anchor) && isDaySatisfied(habit, byDay.get(day.getTime()))) {
        satisfied += 1;
      }
    }
    return Math.round((satisfied / scheduled) * 100);
  };

  const todayLog = byDay.get(todayKey.getTime()) ?? null;
  const todayScore = isHabitScheduledOn(habit, todayKey, anchor)
    ? isDaySatisfied(habit, todayLog)
      ? 100
      : Math.round((todayLog?.value != null && habit.targetValue ? todayLog.value / habit.targetValue : 0) * 100)
    : 0;

  let totalCompletions = 0;
  let totalSkipped = 0;
  let totalQuantity = 0;
  let totalMinutes = 0;
  for (const log of logs) {
    if (log.status === 'skipped') totalSkipped += 1;
    if (isDaySatisfied(habit, log)) totalCompletions += 1;
    if (habit.type === 'numeric' && log.value != null) totalQuantity += log.value;
    if (habit.type === 'duration' && log.value != null) totalMinutes += log.value;
  }
  const totalScheduled = countHabitScheduledInRange(habit, windowStart, todayKey, anchor);
  const totalMissed = Math.max(0, totalScheduled - totalCompletions - totalSkipped);

  // Best week/month within the window — a simple scan, bounded by the same window as everything else.
  let bestWeek: { weekStartISO: string; satisfiedCount: number } | null = null;
  for (let w = windowStart; w.getTime() <= todayKey.getTime(); w = new Date(w.getTime() + 7 * MS_PER_DAY)) {
    const wEnd = new Date(Math.min(w.getTime() + 6 * MS_PER_DAY, todayKey.getTime()));
    let count = 0;
    for (let day = w; day.getTime() <= wEnd.getTime(); day = new Date(day.getTime() + MS_PER_DAY)) {
      if (isHabitScheduledOn(habit, day, anchor) && isDaySatisfied(habit, byDay.get(day.getTime()))) count += 1;
    }
    if (!bestWeek || count > bestWeek.satisfiedCount) {
      bestWeek = { weekStartISO: w.toISOString(), satisfiedCount: count };
    }
  }

  let bestMonth: { month: string; completionPct: number } | null = null;
  {
    const cursor = zonedDayParts(windowStart, ctx.timezone);
    let cy = cursor.year;
    let cm = cursor.month;
    while (cy < year || (cy === year && cm <= month)) {
      const { start, end } = dayKeyMonthRange(cy, cm);
      const clampedEnd = new Date(Math.min(end.getTime() - MS_PER_DAY, todayKey.getTime()));
      const clampedStart = new Date(Math.max(start.getTime(), windowStart.getTime()));
      if (clampedStart.getTime() <= clampedEnd.getTime()) {
        const pct = scoreFor(clampedStart, clampedEnd);
        if (!bestMonth || pct > bestMonth.completionPct) {
          bestMonth = { month: `${cy}-${String(cm).padStart(2, '0')}`, completionPct: pct };
        }
      }
      cm += 1;
      if (cm > 12) {
        cm = 1;
        cy += 1;
      }
    }
  }

  return {
    todayScore,
    weeklyScore: scoreFor(weekStart, todayKey),
    monthlyScore: scoreFor(monthStart, monthEnd),
    totalCompletions,
    totalSkipped,
    totalMissed,
    completionRate: totalScheduled > 0 ? Math.round((totalCompletions / totalScheduled) * 100) : 0,
    currentStreak: habit.currentStreak,
    longestStreak: habit.longestStreak,
    streakUnit: habit.streakUnit,
    consistencyScore: habit.consistencyScore,
    totalMinutes: habit.type === 'duration' ? totalMinutes : null,
    totalQuantity: habit.type === 'numeric' ? totalQuantity : null,
    bestWeek,
    bestMonth,
  };
}

// --- Timer (duration habits) -----------------------------------------------------------------

export async function startHabitTimer(
  ctx: WorkspaceContext,
  id: ObjectId,
  input: StartHabitTimerInput
): Promise<StartTimerResult> {
  const habit = await getOwnedHabit(ctx, id);
  if (habit.type !== 'duration') {
    throw new HabitError('Only duration habits support a timer', 'NOT_A_DURATION_HABIT', 422);
  }
  return startTimerForSource(ctx, {
    sourceType: 'habit',
    sourceId: id,
    title: habit.name,
    color: habit.color,
    note: input.note ?? null,
  });
}

export interface StopHabitTimerResult extends StopTimerResult {
  habit: HabitDto;
}

/**
 * Stop a duration habit's timer and roll the elapsed minutes into today's logged value — the same
 * `incrementValueForDay` path manual entry uses, so a timer stop and a "+1" tap can never drift.
 * Minutes are floored (not rounded) — conservative and deterministic.
 */
export async function stopHabitTimer(ctx: WorkspaceContext, id: ObjectId, sessionId: ObjectId): Promise<StopHabitTimerResult> {
  const habit = await getOwnedHabit(ctx, id);
  if (habit.type !== 'duration' || habit.targetValue == null) {
    throw new HabitError('Only duration habits support a timer', 'NOT_A_DURATION_HABIT', 422);
  }

  const { session, activity } = await stopTimer(ctx, sessionId);
  const minutes = Math.floor((session.durationSeconds ?? 0) / 60);
  const date = zonedDayKey(new Date(), ctx.timezone);

  const log =
    minutes > 0
      ? await habitLogsRepository.incrementValueForDay({
          workspaceId: ctx.workspaceId,
          habitId: id,
          userId: ctx.userId,
          date,
          deltaValue: minutes,
          targetValue: habit.targetValue,
        })
      : await habitLogsRepository.findForDay(id, date);

  const updatedHabit = await recomputeStreak(ctx, habit, date, log);
  return { session, activity, habit: await toHabitDto(ctx, updatedHabit) };
}
