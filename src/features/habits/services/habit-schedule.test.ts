import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  countHabitScheduledInRange,
  habitAnchor,
  isDaySatisfied,
  isHabitScheduledOn,
  progressPct,
  resolveDayState,
  toDayKey,
} from '@/features/habits/services/habit-schedule';
import type { Habit } from '@/features/habits/types/habit';
import type { HabitLog } from '@/features/habits/types/habit-log';

const anchor = { year: 2026, month: 3, day: 1 };
const anchorKey = new Date('2026-03-01T00:00:00.000Z');

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    _id: new ObjectId(),
    workspaceId: new ObjectId(),
    name: 'Test habit',
    description: null,
    color: null,
    icon: null,
    category: null,
    type: 'boolean',
    recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    specificDates: null,
    startDate: null,
    endDate: null,
    targetPerPeriod: null,
    targetValue: null,
    unit: null,
    checklistItems: null,
    reminders: [],
    currentStreak: 0,
    longestStreak: 0,
    streakUnit: 'day',
    consistencyScore: 0,
    lastLoggedDayKey: null,
    streakAnchorDayKey: null,
    graceDaysAllowed: 0,
    graceDaysUsedInCurrentStreak: 0,
    createdBy: new ObjectId(),
    archivedAt: null,
    createdAt: anchorKey,
    updatedAt: anchorKey,
    deletedAt: null,
    ...overrides,
  };
}

function makeLog(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    _id: new ObjectId(),
    workspaceId: new ObjectId(),
    habitId: new ObjectId(),
    userId: new ObjectId(),
    date: anchorKey,
    status: 'completed',
    value: null,
    checkedItemIds: null,
    createdAt: anchorKey,
    updatedAt: anchorKey,
    ...overrides,
  };
}

describe('habitAnchor', () => {
  it('anchors on startDate when set, not createdAt', () => {
    const habit = makeHabit({ startDate: new Date('2026-05-10T00:00:00.000Z'), createdAt: anchorKey });
    expect(habitAnchor(habit, 'UTC')).toEqual({ year: 2026, month: 5, day: 10 });
  });

  it('falls back to createdAt when startDate is null', () => {
    const habit = makeHabit({ startDate: null, createdAt: anchorKey });
    expect(habitAnchor(habit, 'UTC')).toEqual(anchor);
  });
});

describe('isHabitScheduledOn', () => {
  it('delegates to the shared recurrence evaluator when specificDates is empty', () => {
    const habit = makeHabit({ recurrence: { frequency: 'daily', interval: 2, completionBehavior: 'fixed' } });
    expect(isHabitScheduledOn(habit, anchorKey, anchor)).toBe(true);
    expect(isHabitScheduledOn(habit, toDayKey(new Date('2026-03-02T00:00:00.000Z')), anchor)).toBe(false);
  });

  it('specificDates overrides recurrence entirely when non-empty', () => {
    const habit = makeHabit({
      recurrence: { frequency: 'none', interval: 1, completionBehavior: 'fixed' },
      specificDates: [new Date('2026-03-15T00:00:00.000Z'), new Date('2026-04-01T00:00:00.000Z')],
    });
    expect(isHabitScheduledOn(habit, toDayKey(new Date('2026-03-15T00:00:00.000Z')), anchor)).toBe(true);
    expect(isHabitScheduledOn(habit, toDayKey(new Date('2026-03-16T00:00:00.000Z')), anchor)).toBe(false);
  });

  it('respects endDate even with specificDates set', () => {
    const habit = makeHabit({
      endDate: new Date('2026-03-10T00:00:00.000Z'),
      specificDates: [new Date('2026-03-15T00:00:00.000Z')],
    });
    expect(isHabitScheduledOn(habit, toDayKey(new Date('2026-03-15T00:00:00.000Z')), anchor)).toBe(false);
  });
});

describe('isDaySatisfied', () => {
  it('boolean: satisfied only when status is completed', () => {
    const habit = makeHabit({ type: 'boolean' });
    expect(isDaySatisfied(habit, makeLog({ status: 'completed' }))).toBe(true);
    expect(isDaySatisfied(habit, makeLog({ status: 'skipped' }))).toBe(false);
    expect(isDaySatisfied(habit, null)).toBe(false);
  });

  it('numeric/duration: satisfied when value >= targetValue', () => {
    const habit = makeHabit({ type: 'numeric', targetValue: 3 });
    expect(isDaySatisfied(habit, makeLog({ value: 3 }))).toBe(true);
    expect(isDaySatisfied(habit, makeLog({ value: 2 }))).toBe(false);
    expect(isDaySatisfied(habit, makeLog({ value: null }))).toBe(false);
  });

  it('checklist: satisfied only when every item is checked', () => {
    const habit = makeHabit({
      type: 'checklist',
      checklistItems: [
        { id: 'a', name: 'A', order: 0 },
        { id: 'b', name: 'B', order: 1 },
      ],
    });
    expect(isDaySatisfied(habit, makeLog({ checkedItemIds: ['a', 'b'] }))).toBe(true);
    expect(isDaySatisfied(habit, makeLog({ checkedItemIds: ['a'] }))).toBe(false);
    expect(isDaySatisfied(habit, makeLog({ checkedItemIds: [] }))).toBe(false);
  });
});

describe('progressPct', () => {
  it('computes partial progress for numeric habits', () => {
    const habit = makeHabit({ type: 'numeric', targetValue: 4 });
    expect(progressPct(habit, makeLog({ value: 2 }))).toBe(50);
    expect(progressPct(habit, makeLog({ value: 4 }))).toBe(100);
    expect(progressPct(habit, makeLog({ value: 8 }))).toBe(100); // clamped
  });

  it('computes partial progress for checklist habits', () => {
    const habit = makeHabit({
      type: 'checklist',
      checklistItems: [
        { id: 'a', name: 'A', order: 0 },
        { id: 'b', name: 'B', order: 1 },
      ],
    });
    expect(progressPct(habit, makeLog({ checkedItemIds: ['a'] }))).toBe(50);
  });
});

describe('resolveDayState', () => {
  it('returns null for a day the habit is not scheduled on', () => {
    const habit = makeHabit({ recurrence: { frequency: 'none', interval: 1, completionBehavior: 'fixed' } });
    expect(resolveDayState(habit, null, anchorKey, anchorKey, anchor)).toBeNull();
  });

  it('returns "pending" for today with no log', () => {
    const habit = makeHabit();
    expect(resolveDayState(habit, null, anchorKey, anchorKey, anchor)).toBe('pending');
  });

  it('returns "missed" for a past scheduled day with no log', () => {
    const habit = makeHabit();
    // A day after the habit's anchor (Mar 1) but before "today" (Mar 5) — a genuine elapsed gap.
    const past = toDayKey(new Date('2026-03-03T00:00:00.000Z'));
    const today = toDayKey(new Date('2026-03-05T00:00:00.000Z'));
    expect(resolveDayState(habit, null, past, today, anchor)).toBe('missed');
  });

  it('returns the log status when a log exists', () => {
    const habit = makeHabit();
    expect(resolveDayState(habit, makeLog({ status: 'skipped' }), anchorKey, anchorKey, anchor)).toBe('skipped');
  });
});

describe('countHabitScheduledInRange', () => {
  it('counts specific-dates within the range only', () => {
    const habit = makeHabit({
      recurrence: { frequency: 'none', interval: 1, completionBehavior: 'fixed' },
      specificDates: [
        new Date('2026-03-05T00:00:00.000Z'),
        new Date('2026-03-20T00:00:00.000Z'),
        new Date('2026-04-05T00:00:00.000Z'),
      ],
    });
    const count = countHabitScheduledInRange(
      habit,
      toDayKey(new Date('2026-03-01T00:00:00.000Z')),
      toDayKey(new Date('2026-03-31T00:00:00.000Z')),
      anchor
    );
    expect(count).toBe(2);
  });
});
