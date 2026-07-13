import 'server-only';
import type { GreetingData } from '@/features/dashboard/types/dashboard';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { toISODate, zonedDayKey, zonedDayParts, zonedHour } from '@/lib/time/day';

const MESSAGES = [
  'Small steps every day add up to big results.',
  'Focus on progress, not perfection.',
  'One task at a time — you’ve got this.',
  'Consistency beats intensity.',
  'Make today count.',
  'Your future self will thank you.',
  'Momentum starts with a single done.',
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function greetingBucket(hour: number): GreetingData['greeting'] {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * The greeting header: time-of-day bucket, the user's name, today's date, and a motivational line
 * that is stable within a day (seeded by the day key) so it doesn't flicker on refetch. Weather is
 * reserved for a future feature and always null.
 */
export function buildGreeting(ctx: WorkspaceContext, name: string): GreetingData {
  const now = new Date();
  const parts = zonedDayParts(now, ctx.timezone);
  const dayIndex = Math.floor(zonedDayKey(now, ctx.timezone).getTime() / MS_PER_DAY);

  return {
    name,
    greeting: greetingBucket(zonedHour(now, ctx.timezone)),
    message: MESSAGES[((dayIndex % MESSAGES.length) + MESSAGES.length) % MESSAGES.length],
    dateISO: toISODate(parts),
    timezone: ctx.timezone,
    weather: null,
  };
}
