import { describe, it, expect } from 'vitest';
import {
  addDaysToDayKey,
  toISODate,
  zonedDayKey,
  zonedDayParts,
  zonedDayRange,
} from '@/lib/time/day';

describe('lib/time/day', () => {
  it('reads UTC calendar parts unchanged in UTC', () => {
    const instant = new Date('2026-07-13T15:30:00.000Z');
    expect(zonedDayParts(instant, 'UTC')).toEqual({ year: 2026, month: 7, day: 13 });
  });

  it('rolls the local day back for a late-evening instant in a negative-offset zone', () => {
    // 02:30 UTC on the 13th is 22:30 on the 12th in New York (UTC-4 in July).
    const instant = new Date('2026-07-13T02:30:00.000Z');
    expect(zonedDayParts(instant, 'America/New_York')).toEqual({ year: 2026, month: 7, day: 12 });
  });

  it('rolls the local day forward for an early instant in a positive-offset zone', () => {
    // 22:30 UTC on the 12th is 07:30 on the 13th in Tokyo (UTC+9).
    const instant = new Date('2026-07-12T22:30:00.000Z');
    expect(zonedDayParts(instant, 'Asia/Tokyo')).toEqual({ year: 2026, month: 7, day: 13 });
  });

  it('produces a midnight-UTC day key for the local calendar day', () => {
    const instant = new Date('2026-07-13T02:30:00.000Z');
    // Local day in NY is the 12th → key is 2026-07-12T00:00Z.
    expect(zonedDayKey(instant, 'America/New_York').toISOString()).toBe('2026-07-12T00:00:00.000Z');
  });

  it('bounds a UTC day as a 24h [start, end) window', () => {
    const instant = new Date('2026-07-13T15:30:00.000Z');
    const { start, end } = zonedDayRange(instant, 'UTC');
    expect(start.toISOString()).toBe('2026-07-13T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-14T00:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('bounds a New York day at the correct UTC instants (UTC-4 in summer)', () => {
    const instant = new Date('2026-07-13T15:30:00.000Z'); // 11:30 EDT on the 13th
    const { start, end } = zonedDayRange(instant, 'America/New_York');
    expect(start.toISOString()).toBe('2026-07-13T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-14T04:00:00.000Z');
  });

  it('spans 23 hours across a spring-forward DST boundary', () => {
    // US DST began 2026-03-08; the local day is only 23 hours long.
    const instant = new Date('2026-03-08T12:00:00.000Z');
    const { start, end } = zonedDayRange(instant, 'America/New_York');
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it('adds days to a day key across a month boundary', () => {
    const key = new Date(Date.UTC(2026, 6, 31));
    expect(addDaysToDayKey(key, 1).toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(addDaysToDayKey(key, -1).toISOString()).toBe('2026-07-30T00:00:00.000Z');
  });

  it('formats ISO dates', () => {
    expect(toISODate({ year: 2026, month: 7, day: 5 })).toBe('2026-07-05');
  });
});
