import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  initialStreakCache,
  recomputeStreakFull,
  recomputeStreakIncremental,
  recomputePeriodStreak,
  stepConsistency,
} from '@/features/habits/services/streak';
import { toDayKey } from '@/features/habits/services/habit-schedule';
import type { Habit } from '@/features/habits/types/habit';
import type { HabitLog } from '@/features/habits/types/habit-log';

const anchor = { year: 2026, month: 3, day: 1 }; // Sunday
const day0 = toDayKey(new Date('2026-03-01T00:00:00.000Z'));
function day(n: number): Date {
  return toDayKey(new Date(day0.getTime() + n * 24 * 60 * 60 * 1000));
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    _id: new ObjectId(),
    workspaceId: new ObjectId(),
    name: 'Test',
    description: null,
    color: null,
    icon: null,
    category: null,
    type: 'boolean',
    recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    specificDates: null,
    startDate: day0,
    endDate: null,
    targetPerPeriod: null,
    targetValue: null,
    unit: null,
    checklistItems: null,
    reminders: [],
    createdBy: new ObjectId(),
    archivedAt: null,
    createdAt: day0,
    updatedAt: day0,
    deletedAt: null,
    graceDaysAllowed: 0,
    graceDaysUsedInCurrentStreak: 0,
    ...initialStreakCache(),
    ...overrides,
  };
}

function makeLog(d: Date, overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    _id: new ObjectId(),
    workspaceId: new ObjectId(),
    habitId: new ObjectId(),
    userId: new ObjectId(),
    date: d,
    status: 'completed',
    value: null,
    checkedItemIds: null,
    createdAt: d,
    updatedAt: d,
    ...overrides,
  };
}

describe('stepConsistency', () => {
  it('moves toward 100 on satisfied and toward 0 on unsatisfied', () => {
    expect(stepConsistency(50, true)).toBeGreaterThan(50);
    expect(stepConsistency(50, false)).toBeLessThan(50);
  });
});

describe('recomputeStreakIncremental', () => {
  it('starts a streak of 1 on the first-ever satisfied log', () => {
    const habit = makeHabit();
    const patch = recomputeStreakIncremental(habit, day(0), true, anchor);
    expect(patch.currentStreak).toBe(1);
    expect(patch.longestStreak).toBe(1);
    expect(patch.streakAnchorDayKey?.getTime()).toBe(day(0).getTime());
    expect(patch.consistencyScore).toBe(stepConsistency(0, true));
  });

  it('extends the streak on the next consecutive scheduled day', () => {
    const habit = makeHabit({ ...recomputeStreakIncremental(makeHabit(), day(0), true, anchor) });
    const patch = recomputeStreakIncremental(habit, day(1), true, anchor);
    expect(patch.currentStreak).toBe(2);
    expect(patch.longestStreak).toBe(2);
    expect(patch.streakAnchorDayKey?.getTime()).toBe(day(0).getTime());
  });

  it('resets the streak when a gap contains an unlogged scheduled day', () => {
    let habit = makeHabit();
    habit = { ...habit, ...recomputeStreakIncremental(habit, day(0), true, anchor) };
    habit = { ...habit, ...recomputeStreakIncremental(habit, day(1), true, anchor) };
    // Jump straight to day 4, skipping days 2 and 3 (both scheduled, both unlogged).
    const patch = recomputeStreakIncremental(habit, day(4), true, anchor);
    expect(patch.currentStreak).toBe(1);
    expect(patch.longestStreak).toBe(2); // the earlier 2-day run is still the record
    expect(patch.streakAnchorDayKey?.getTime()).toBe(day(4).getTime());
  });

  it('resets the streak to 0 when today is logged but unsatisfied', () => {
    let habit = makeHabit();
    habit = { ...habit, ...recomputeStreakIncremental(habit, day(0), true, anchor) };
    const patch = recomputeStreakIncremental(habit, day(1), false, anchor);
    expect(patch.currentStreak).toBe(0);
    expect(patch.streakAnchorDayKey).toBeNull();
    expect(patch.longestStreak).toBe(1); // unchanged, not regressed
  });

  it('does not step the streak or consistency for a day the habit is not scheduled on', () => {
    const habit = makeHabit({ recurrence: { frequency: 'daily', interval: 2, completionBehavior: 'fixed' } });
    // day(1) is not scheduled under interval-2 daily starting at the anchor.
    const patch = recomputeStreakIncremental(habit, day(1), true, anchor);
    expect(patch.currentStreak).toBe(0);
    expect(patch.consistencyScore).toBe(habit.consistencyScore);
  });
});

describe('recomputeStreakFull agrees with the incremental path over an equivalent history', () => {
  it('produces the same currentStreak/longestStreak for a run with one gap', () => {
    const habit = makeHabit();
    const logDays = [0, 1, 2, 5, 6]; // gap at 3,4

    // Incremental: apply log-by-log.
    let incremental = makeHabit();
    for (const d of logDays) {
      incremental = { ...incremental, ...recomputeStreakIncremental(incremental, day(d), true, anchor) };
    }

    // Full: one bounded recompute from the actual logs.
    const logs = logDays.map((d) => makeLog(day(d)));
    const full = recomputeStreakFull(habit, logs, day(0), day(6), anchor);

    expect(full.currentStreak).toBe(incremental.currentStreak);
    expect(full.longestStreak).toBe(incremental.longestStreak);
    expect(full.currentStreak).toBe(2); // days 5,6
    expect(full.longestStreak).toBe(3); // days 0,1,2
  });
});

describe('recomputePeriodStreak', () => {
  it('does not break the streak for a currently-open week that has not yet met target', () => {
    const habit = makeHabit({
      recurrence: { frequency: 'weekly', interval: 1, completionBehavior: 'fixed' },
      targetPerPeriod: 3,
    });
    // Only 1 satisfied day so far in the current (still-open) week.
    const logs = [makeLog(day(0))];
    const patch = recomputePeriodStreak(habit, logs, day(0), day(0), anchor);
    expect(patch.currentStreak).toBe(0); // hasn't met target yet, but week isn't over
    expect(patch.streakUnit).toBe('period');
  });

  it('counts a week toward the streak once target is met', () => {
    const habit = makeHabit({
      recurrence: { frequency: 'weekly', interval: 1, completionBehavior: 'fixed' },
      targetPerPeriod: 3,
    });
    const logs = [makeLog(day(0)), makeLog(day(1)), makeLog(day(2))];
    const patch = recomputePeriodStreak(habit, logs, day(0), day(2), anchor);
    expect(patch.currentStreak).toBe(1);
  });

  it('breaks the streak on a fully-elapsed week that missed target', () => {
    const habit = makeHabit({
      recurrence: { frequency: 'weekly', interval: 1, completionBehavior: 'fixed' },
      targetPerPeriod: 3,
    });
    // Week 0 (days 0-6): met target (3 satisfied). Week 1 (days 7-13): only 1 satisfied.
    // "Today" is day 14 (the start of week 2), so week 1 is fully in the past, not the open week.
    const logs = [makeLog(day(0)), makeLog(day(1)), makeLog(day(2)), makeLog(day(7))];
    const patch = recomputePeriodStreak(habit, logs, day(0), day(14), anchor);
    expect(patch.currentStreak).toBe(0);
    expect(patch.longestStreak).toBe(1);
  });
});
