import { describe, it, expect } from 'vitest';
import { isScheduledOn, countScheduledInRange } from '@/lib/time/recurrence';
import { addDaysToDayKey } from '@/lib/time/day';
import type { Recurrence } from '@/schemas/schedulable.schema';

const anchor = { year: 2026, month: 3, day: 1 }; // 2026-03-01 is a Sunday
const anchorKey = new Date('2026-03-01T00:00:00.000Z');

function recurrence(overrides: Partial<Recurrence>): Recurrence {
  return { frequency: 'daily', interval: 1, completionBehavior: 'fixed', ...overrides };
}

describe('isScheduledOn', () => {
  it('daily with interval 1 matches every day', () => {
    const r = recurrence({ frequency: 'daily', interval: 1 });
    for (let i = 0; i < 10; i++) {
      expect(isScheduledOn(r, addDaysToDayKey(anchorKey, i), anchor)).toBe(true);
    }
  });

  it('daily with interval 2 matches every other day since the anchor', () => {
    const r = recurrence({ frequency: 'daily', interval: 2 });
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 0), anchor)).toBe(true);
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 1), anchor)).toBe(false);
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 2), anchor)).toBe(true);
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 3), anchor)).toBe(false);
  });

  it('rejects days before the anchor', () => {
    const r = recurrence({ frequency: 'daily', interval: 1 });
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, -1), anchor)).toBe(false);
  });

  it('weekly with explicit daysOfWeek only matches those weekdays', () => {
    const r = recurrence({ frequency: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] }); // Mon/Wed/Fri
    // anchor (Mar 1) is a Sunday (0) — not in the set.
    expect(isScheduledOn(r, anchorKey, anchor)).toBe(false);
    // Mar 2 is Monday.
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 1), anchor)).toBe(true);
    // Mar 3 is Tuesday.
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 2), anchor)).toBe(false);
  });

  it('weekly with empty daysOfWeek defaults to the anchor weekday, not every day', () => {
    const r = recurrence({ frequency: 'weekly', interval: 1 });
    // anchor is Sunday — only Sundays should match, not every day.
    expect(isScheduledOn(r, anchorKey, anchor)).toBe(true);
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 1), anchor)).toBe(false);
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 7), anchor)).toBe(true);
  });

  it('weekly with interval 2 matches only every other week', () => {
    const r = recurrence({ frequency: 'weekly', interval: 2, daysOfWeek: [0] }); // Sundays, every 2 weeks
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 0), anchor)).toBe(true); // week 0
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 7), anchor)).toBe(false); // week 1
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 14), anchor)).toBe(true); // week 2
  });

  it('monthly matches the same day-of-month as the anchor', () => {
    const r = recurrence({ frequency: 'monthly', interval: 1 });
    expect(isScheduledOn(r, anchorKey, anchor)).toBe(true);
    expect(isScheduledOn(r, new Date('2026-04-01T00:00:00.000Z'), anchor)).toBe(true);
    expect(isScheduledOn(r, new Date('2026-04-02T00:00:00.000Z'), anchor)).toBe(false);
  });

  it('monthly with interval 3 only matches every third month', () => {
    const r = recurrence({ frequency: 'monthly', interval: 3 });
    expect(isScheduledOn(r, new Date('2026-04-01T00:00:00.000Z'), anchor)).toBe(false);
    expect(isScheduledOn(r, new Date('2026-06-01T00:00:00.000Z'), anchor)).toBe(true);
  });

  it('yearly matches the same month and day-of-month', () => {
    const r = recurrence({ frequency: 'yearly', interval: 1 });
    expect(isScheduledOn(r, anchorKey, anchor)).toBe(true);
    expect(isScheduledOn(r, new Date('2027-03-01T00:00:00.000Z'), anchor)).toBe(true);
    expect(isScheduledOn(r, new Date('2027-04-01T00:00:00.000Z'), anchor)).toBe(false);
  });

  it('respects an endDate cutoff', () => {
    const r = recurrence({ frequency: 'daily', interval: 1, endDate: addDaysToDayKey(anchorKey, 5) });
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 5), anchor)).toBe(true);
    expect(isScheduledOn(r, addDaysToDayKey(anchorKey, 6), anchor)).toBe(false);
  });

  it('never schedules a "none" frequency', () => {
    const r = recurrence({ frequency: 'none' });
    expect(isScheduledOn(r, anchorKey, anchor)).toBe(false);
  });

  it('handles a leap-year Feb 29 anchor for yearly recurrence without throwing', () => {
    const leapAnchor = { year: 2028, month: 2, day: 29 };
    const leapAnchorKey = new Date('2028-02-29T00:00:00.000Z');
    const r = recurrence({ frequency: 'yearly', interval: 1 });
    expect(isScheduledOn(r, leapAnchorKey, leapAnchor)).toBe(true);
    // 2029 has no Feb 29 — no day in 2029 should match day=29,month=2.
    expect(isScheduledOn(r, new Date('2029-03-01T00:00:00.000Z'), leapAnchor)).toBe(false);
  });
});

describe('countScheduledInRange', () => {
  it('counts every scheduled day-2 interval occurrence in a bounded range', () => {
    const r = recurrence({ frequency: 'daily', interval: 2 });
    const count = countScheduledInRange(r, anchorKey, addDaysToDayKey(anchorKey, 9), anchor);
    expect(count).toBe(5); // days 0,2,4,6,8
  });
});
