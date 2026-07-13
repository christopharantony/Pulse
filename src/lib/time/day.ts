/**
 * Timezone-aware day-boundary math — the single source of truth for "what day is it for this user".
 *
 * The dashboard's "today", "overdue", habit streaks, and daily rollups are all day-boundary
 * sensitive, and the boundary depends on the workspace timezone (not the server's). Getting this in
 * one place (rather than ad-hoc `new Date()` math per aggregator) is the mitigation for the
 * timezone-bug risk called out in the Phase 6 design. Implemented with `Intl` only — the codebase
 * has no date library and none is needed for day boundaries.
 *
 * Two distinct notions of "day" live here, matching how the data is stored:
 *  - **Day range**: the pair of real UTC instants that bound a tz-local calendar day. Used to
 *    filter instant-valued fields (`tasks.dueDate`, `time_sessions.startedAt`).
 *  - **Day key**: midnight *UTC* of a calendar day, used as the canonical key for day-bucketed docs
 *    (`habit_logs.date`, `analytics_daily_rollups.date`) — see those repositories' `toDayKey`.
 */

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export interface DayParts {
  /** Full year, e.g. 2026. */
  year: number;
  /** 1-based month (1 = January). */
  month: number;
  /** Day of month, 1–31. */
  day: number;
}

/**
 * How far ahead of UTC the zone's wall clock is, in ms, at the given instant (positive east of UTC).
 * The standard `Intl` technique: format the instant into the zone's wall-clock parts, read them back
 * as if they were UTC, and diff against the true instant.
 */
function zoneOffsetMs(instant: Date, timezone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - instant.getTime();
}

/** The tz-local calendar date (year/month/day) an instant falls on. */
export function zonedDayParts(instant: Date, timezone: string): DayParts {
  const offset = zoneOffsetMs(instant, timezone);
  const wall = new Date(instant.getTime() + offset); // wall-clock time read via UTC getters
  return { year: wall.getUTCFullYear(), month: wall.getUTCMonth() + 1, day: wall.getUTCDate() };
}

/** The tz-local hour (0–23) an instant falls on — used to pick the greeting bucket. */
export function zonedHour(instant: Date, timezone: string): number {
  const offset = zoneOffsetMs(instant, timezone);
  return new Date(instant.getTime() + offset).getUTCHours();
}

/**
 * The real UTC instant of wall-clock midnight for a tz-local calendar day. Two-pass so DST days
 * resolve correctly (the offset used to convert can itself change across the boundary); converges
 * outside the ~1h DST spring-forward gap, which is acceptable for day boundaries.
 */
function zonedMidnightInstant(parts: DayParts, timezone: string): Date {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  const firstOffset = zoneOffsetMs(new Date(guess), timezone);
  const secondOffset = zoneOffsetMs(new Date(guess - firstOffset), timezone);
  return new Date(guess - secondOffset);
}

/**
 * The `[start, end)` UTC instants bounding the tz-local calendar day containing `instant`. `end` is
 * exclusive (start of the next local day), so a `{ $gte: start, $lt: end }` filter is DST-safe even
 * on 23-/25-hour days.
 */
export function zonedDayRange(instant: Date, timezone: string): { start: Date; end: Date } {
  const start = zonedMidnightInstant(zonedDayParts(instant, timezone), timezone);
  // 36h past local midnight always lands at local noon the next day → correct next-day parts.
  const nextParts = zonedDayParts(new Date(start.getTime() + 36 * MS_PER_HOUR), timezone);
  const end = zonedMidnightInstant(nextParts, timezone);
  return { start, end };
}

/**
 * Midnight-UTC day key for the tz-local calendar day containing `instant` — matches how day-bucketed
 * collections (`habit_logs`, `analytics_daily_rollups`) store their `date` field.
 */
export function zonedDayKey(instant: Date, timezone: string): Date {
  const { year, month, day } = zonedDayParts(instant, timezone);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Add `n` whole days to a midnight-UTC day key (n may be negative). Pure UTC arithmetic. */
export function addDaysToDayKey(dayKey: Date, n: number): Date {
  return new Date(dayKey.getTime() + n * MS_PER_DAY);
}

/** ISO `YYYY-MM-DD` for a day key or the tz-local day of an instant. */
export function toISODate(parts: DayParts): string {
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}
