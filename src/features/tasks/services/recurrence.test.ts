import { describe, it, expect } from 'vitest';
import { computeNextDueDate, isExpired } from '@/features/tasks/services/recurrence';
import type { Recurrence } from '@/schemas/schedulable.schema';

function recurrence(overrides: Partial<Recurrence>): Recurrence {
  return { frequency: 'daily', interval: 1, completionBehavior: 'fixed', ...overrides };
}

describe('computeNextDueDate — fixed completionBehavior (anchors on the original due date)', () => {
  it('daily: steps one day from the due date regardless of when completed', () => {
    const due = new Date('2026-07-13T00:00:00.000Z'); // Monday
    const completedLate = new Date('2026-07-15T00:00:00.000Z'); // Wednesday
    const next = computeNextDueDate(due, recurrence({ frequency: 'daily' }), completedLate);
    expect(next.toISOString()).toBe('2026-07-14T00:00:00.000Z'); // Tuesday, not "Wed + 1"
  });

  it('every-X-days via interval: daily + interval 3', () => {
    const due = new Date('2026-07-13T00:00:00.000Z');
    const next = computeNextDueDate(due, recurrence({ frequency: 'daily', interval: 3 }), due);
    expect(next.toISOString()).toBe('2026-07-16T00:00:00.000Z');
  });

  it('weekly without daysOfWeek: steps 7 days per interval', () => {
    const due = new Date('2026-07-13T00:00:00.000Z');
    const next = computeNextDueDate(due, recurrence({ frequency: 'weekly', interval: 2 }), due);
    expect(next.toISOString()).toBe('2026-07-27T00:00:00.000Z');
  });

  it('weekdays: weekly + daysOfWeek=[1..5] finds the next matching weekday', () => {
    const friday = new Date('2026-07-17T00:00:00.000Z');
    const next = computeNextDueDate(
      friday,
      recurrence({ frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5] }),
      friday
    );
    // Next weekday after Friday is Monday.
    expect(next.getUTCDay()).toBe(1);
  });

  it('monthly: clamps to the last day of a shorter target month', () => {
    const jan31 = new Date('2026-01-31T00:00:00.000Z');
    const next = computeNextDueDate(jan31, recurrence({ frequency: 'monthly' }), jan31);
    expect(next.getUTCMonth()).toBe(1); // February
    expect(next.getUTCDate()).toBe(28); // 2026 is not a leap year
  });

  it('every-X-months via interval: monthly + interval 3', () => {
    const jan15 = new Date('2026-01-15T00:00:00.000Z');
    const next = computeNextDueDate(jan15, recurrence({ frequency: 'monthly', interval: 3 }), jan15);
    expect(next.getUTCMonth()).toBe(3); // April
  });

  it('yearly: steps one year', () => {
    const date = new Date('2026-07-13T00:00:00.000Z');
    const next = computeNextDueDate(date, recurrence({ frequency: 'yearly' }), date);
    expect(next.getUTCFullYear()).toBe(2027);
  });
});

describe('computeNextDueDate — rolling completionBehavior (anchors on completedAt)', () => {
  it('daily: next due date is one day after actual completion, not the original due date', () => {
    const due = new Date('2026-07-13T00:00:00.000Z');
    const completedLate = new Date('2026-07-15T00:00:00.000Z');
    const next = computeNextDueDate(
      due,
      recurrence({ frequency: 'daily', completionBehavior: 'rolling' }),
      completedLate
    );
    expect(next.toISOString()).toBe('2026-07-16T00:00:00.000Z');
  });
});

describe('isExpired', () => {
  it('is false when there is no endDate', () => {
    expect(isExpired(recurrence({}), new Date('2030-01-01'))).toBe(false);
  });

  it('is true once asOf passes endDate', () => {
    const r = recurrence({ endDate: new Date('2026-01-01T00:00:00.000Z') });
    expect(isExpired(r, new Date('2026-01-02T00:00:00.000Z'))).toBe(true);
    expect(isExpired(r, new Date('2025-12-31T00:00:00.000Z'))).toBe(false);
  });
});
