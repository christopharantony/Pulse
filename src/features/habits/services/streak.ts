import 'server-only';
import type { DayParts } from '@/lib/time/day';
import type { Habit, HabitStreakUnit } from '@/features/habits/types/habit';
import type { HabitLog } from '@/features/habits/types/habit-log';
import { isHabitScheduledOn, isDaySatisfied, toDayKey } from '@/features/habits/services/habit-schedule';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How much a scheduled day's satisfaction (or lack of it) moves the EWMA — lower = smoother. */
const CONSISTENCY_ALPHA = 0.1;

/**
 * Explicit bound on how far back a full/period streak recompute will read `habit_logs` or walk
 * gap days. A decade-old daily habit's backfill-to-day-1 edit should not scan unbounded history —
 * streak/longest-streak accuracy before this window is accepted as potentially stale.
 */
export const MAX_RECOMPUTE_WINDOW_DAYS = 1095; // ~3 years

export interface StreakCacheFields {
  currentStreak: number;
  longestStreak: number;
  streakUnit: HabitStreakUnit;
  consistencyScore: number;
  lastLoggedDayKey: Date | null;
  streakAnchorDayKey: Date | null;
}

function dayKeyFromParts(parts: DayParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(day: Date, n: number): Date {
  return new Date(day.getTime() + n * MS_PER_DAY);
}

/** One EWMA step over scheduled days only — non-scheduled days must not call this (skip, not zero). */
export function stepConsistency(previous: number, satisfied: boolean): number {
  const target = satisfied ? 100 : 0;
  return Math.round(CONSISTENCY_ALPHA * target + (1 - CONSISTENCY_ALPHA) * previous);
}

/**
 * Fresh streak-cache values for a brand-new habit — zero history, cold-start EWMA. Exported so
 * `createHabit` never hand-rolls these defaults.
 */
export function initialStreakCache(): StreakCacheFields {
  return {
    currentStreak: 0,
    longestStreak: 0,
    streakUnit: 'day',
    consistencyScore: 0,
    lastLoggedDayKey: null,
    streakAnchorDayKey: null,
  };
}

/**
 * Day-based incremental recompute — the hot path, called after every log write for a day strictly
 * newer than `habit.lastLoggedDayKey`. Zero `habit_logs` reads: any scheduled day between the old
 * cursor and the new one is, by construction, unlogged (nothing newer than the old cursor existed
 * before this call), so its satisfaction is deterministically false — no need to read it back.
 * The gap walk is pure day-key iteration, capped at {@link MAX_RECOMPUTE_WINDOW_DAYS} for safety
 * against a habit that hasn't been logged in years suddenly receiving a far-future log.
 *
 * Callers must only use this when `habit.lastLoggedDayKey == null || loggedDayKey > lastLoggedDayKey`
 * — editing today or backfilling a past day must go through {@link recomputeStreakFull} instead,
 * since a past day's satisfaction can't be assumed from its absence (it may already have a log).
 */
export function recomputeStreakIncremental(
  habit: Habit,
  loggedDayKey: Date,
  satisfiedToday: boolean,
  anchor: DayParts
): StreakCacheFields {
  let currentStreak = habit.currentStreak;
  let consistencyScore = habit.consistencyScore;
  let streakAnchorDayKey = habit.streakAnchorDayKey;
  let longestStreak = habit.longestStreak;

  const gapStart = habit.lastLoggedDayKey ? addDays(habit.lastLoggedDayKey, 1) : loggedDayKey;
  const walkStart = new Date(
    Math.max(gapStart.getTime(), addDays(loggedDayKey, -MAX_RECOMPUTE_WINDOW_DAYS).getTime())
  );

  // Every scheduled day strictly before `loggedDayKey` in the gap is a guaranteed miss (no log
  // exists for it) — walking it forward breaks the run and steps consistency toward 0.
  for (let day = walkStart; day.getTime() < loggedDayKey.getTime(); day = addDays(day, 1)) {
    if (isHabitScheduledOn(habit, day, anchor)) {
      consistencyScore = stepConsistency(consistencyScore, false);
      currentStreak = 0;
      streakAnchorDayKey = null;
    }
  }

  if (isHabitScheduledOn(habit, loggedDayKey, anchor)) {
    consistencyScore = stepConsistency(consistencyScore, satisfiedToday);
    if (satisfiedToday) {
      currentStreak += 1;
      streakAnchorDayKey = streakAnchorDayKey ?? loggedDayKey;
    } else {
      currentStreak = 0;
      streakAnchorDayKey = null;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return {
    currentStreak,
    longestStreak,
    streakUnit: 'day',
    consistencyScore,
    lastLoggedDayKey: loggedDayKey,
    streakAnchorDayKey,
  };
}

/**
 * Day-based bounded full recompute — the rare path, used for historical edits/backfills where a
 * day's satisfaction can't be assumed and must be read from real `habit_logs` data. `logs` must
 * already be the bounded range read (`windowStart..todayKey`); this function is pure otherwise.
 * `longestStreak` is floored at the habit's existing cached value so a windowed recompute can never
 * regress a record set further back than the window covers (the accepted staleness tradeoff for
 * runs that started before `windowStart`).
 */
export function recomputeStreakFull(
  habit: Habit,
  logs: HabitLog[],
  windowStart: Date,
  todayKey: Date,
  anchor: DayParts
): StreakCacheFields {
  const byDay = new Map<number, HabitLog>();
  for (const log of logs) byDay.set(toDayKey(log.date).getTime(), log);

  let run = 0;
  let runAnchor: Date | null = null;
  let windowLongest = 0;
  let consistencyScore = habit.consistencyScore;

  for (let day = windowStart; day.getTime() <= todayKey.getTime(); day = addDays(day, 1)) {
    if (!isHabitScheduledOn(habit, day, anchor)) continue;
    const satisfied = isDaySatisfied(habit, byDay.get(day.getTime()));
    consistencyScore = stepConsistency(consistencyScore, satisfied);
    if (satisfied) {
      run += 1;
      runAnchor = runAnchor ?? day;
      windowLongest = Math.max(windowLongest, run);
    } else {
      run = 0;
      runAnchor = null;
    }
  }

  return {
    currentStreak: run,
    longestStreak: Math.max(habit.longestStreak, windowLongest),
    streakUnit: 'day',
    consistencyScore,
    lastLoggedDayKey: todayKey,
    streakAnchorDayKey: runAnchor,
  };
}

/**
 * Period-based recompute for `targetPerPeriod` habits (e.g. "3x/week") — a genuinely different
 * streak unit than day-consecutive. Weeks are indexed by whole weeks since the habit's anchor (not
 * `weekStartsOn`), the same scheme `isScheduledOn`'s weekly `interval` uses, so both stay
 * self-consistent. `logs` must be a bounded range read, same shape as {@link recomputeStreakFull}.
 * The currently-open (not-yet-elapsed) week never breaks the run if it hasn't met target yet — it
 * simply doesn't extend it until it does.
 */
export function recomputePeriodStreak(
  habit: Habit,
  logs: HabitLog[],
  windowStart: Date,
  todayKey: Date,
  anchor: DayParts
): StreakCacheFields {
  const anchorDayKey = dayKeyFromParts(anchor);
  const weekIndexOf = (day: Date) => Math.floor((day.getTime() - anchorDayKey.getTime()) / (7 * MS_PER_DAY));

  const byDay = new Map<number, HabitLog>();
  for (const log of logs) byDay.set(toDayKey(log.date).getTime(), log);

  const satisfiedCountByWeek = new Map<number, number>();
  for (let day = windowStart; day.getTime() <= todayKey.getTime(); day = addDays(day, 1)) {
    if (!isHabitScheduledOn(habit, day, anchor)) continue;
    if (isDaySatisfied(habit, byDay.get(day.getTime()))) {
      const w = weekIndexOf(day);
      satisfiedCountByWeek.set(w, (satisfiedCountByWeek.get(w) ?? 0) + 1);
    }
  }

  const target = habit.targetPerPeriod ?? 1;
  const currentWeekIndex = weekIndexOf(todayKey);
  const startWeekIndex = weekIndexOf(windowStart);

  // Walk newest -> oldest for currentStreak (stops at the first fully-elapsed week that missed).
  let currentStreak = 0;
  for (let w = currentWeekIndex; w >= startWeekIndex; w--) {
    const met = (satisfiedCountByWeek.get(w) ?? 0) >= target;
    if (met) {
      currentStreak += 1;
      continue;
    }
    if (w === currentWeekIndex) continue; // this week isn't over yet — doesn't break the run
    break;
  }

  // Walk oldest -> newest for the longest historical run of met-target weeks.
  let longestRun = 0;
  let run = 0;
  for (let w = startWeekIndex; w <= currentWeekIndex; w++) {
    const met = (satisfiedCountByWeek.get(w) ?? 0) >= target;
    if (met) {
      run += 1;
      longestRun = Math.max(longestRun, run);
    } else if (w !== currentWeekIndex) {
      run = 0;
    }
  }

  // Consistency still steps per scheduled day (not per week) so it stays comparable across habit types.
  let consistencyScore = habit.consistencyScore;
  for (let day = windowStart; day.getTime() <= todayKey.getTime(); day = addDays(day, 1)) {
    if (!isHabitScheduledOn(habit, day, anchor)) continue;
    consistencyScore = stepConsistency(consistencyScore, isDaySatisfied(habit, byDay.get(day.getTime())));
  }

  return {
    currentStreak,
    longestStreak: Math.max(habit.longestStreak, longestRun),
    streakUnit: 'period',
    consistencyScore,
    lastLoggedDayKey: todayKey,
    streakAnchorDayKey: null, // period streaks don't track a day-anchor — the week walk is self-contained
  };
}
