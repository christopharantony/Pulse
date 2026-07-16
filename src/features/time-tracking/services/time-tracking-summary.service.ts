import 'server-only';
import { activityRepository } from '@/features/activity/repositories/activity.repository';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import type { Activity } from '@/features/activity/types/activity';
import type { TimeSession } from '@/features/time-tracking/types/time-session';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { toISODate, zonedDayParts, zonedDayRange } from '@/lib/time/day';

/**
 * Sum tracked seconds across a set of sessions, counting live elapsed time for the one
 * `endedAt == null` session as of `now`. Extracted from the dashboard's
 * `metrics.aggregator.ts#gatherTodayMetrics` so both call sites agree on the definition of
 * "focus time" instead of maintaining two copies of the same loop.
 */
export function sumFocusSeconds(sessions: TimeSession[], now: Date): number {
  let seconds = 0;
  for (const session of sessions) {
    if (session.durationSeconds != null) {
      seconds += session.durationSeconds;
    } else if (session.endedAt == null) {
      seconds += Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
    }
  }
  return seconds;
}

export interface RunningSession {
  session: TimeSession;
  activity: Activity;
}

/** The user's currently-running session (any source) plus its Activity, or `null` if none. */
export async function getRunningSession(ctx: WorkspaceContext): Promise<RunningSession | null> {
  const session = await timeSessionRepository.findRunningForUser(ctx.userId);
  if (!session) return null;
  const activity = await activityRepository.findById(session.activityId);
  if (!activity) return null;
  return { session, activity };
}

export interface TodaySummary {
  /** Sum of `durationSeconds` for sessions that started and already stopped today. */
  completedSeconds: number;
  /**
   * `startedAt` of the running session, clamped to today's start if it began on an earlier day —
   * so a client computing `now - runningStartedAt` gets exactly today's contribution, not the
   * whole cross-midnight session. `null` when nothing is running.
   */
  runningStartedAt: string | null;
  sessionCount: number;
}

/** Today's tracked time (tz-local calendar day), including the live portion of a running timer. */
export async function getTodaySummary(ctx: WorkspaceContext): Promise<TodaySummary> {
  const now = new Date();
  const { start, end } = zonedDayRange(now, ctx.timezone);
  const [sessions, running] = await Promise.all([
    timeSessionRepository.listForUserRange(ctx.workspaceId, ctx.userId, start, end),
    timeSessionRepository.findRunningForUser(ctx.userId),
  ]);

  const completedToday = sessions.filter((s) => s.durationSeconds != null);
  const completedSeconds = completedToday.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const runningStartedAt = running ? new Date(Math.max(running.startedAt.getTime(), start.getTime())) : null;

  return {
    completedSeconds,
    runningStartedAt: runningStartedAt ? runningStartedAt.toISOString() : null,
    sessionCount: completedToday.length + (running ? 1 : 0),
  };
}

export interface HistoryDay {
  /** ISO `YYYY-MM-DD`, tz-local. */
  dayKey: string;
  totalSeconds: number;
  sessionCount: number;
}

/**
 * Exact, DST-safe day boundaries for the `days` tz-local calendar days ending today, oldest first.
 * Walks backwards one day at a time: `zonedDayRange`'s `start` is an exact real-instant boundary, so
 * `start - 1ms` is guaranteed to fall in the previous calendar day — no approximate `-24h` arithmetic
 * that could drift across a DST transition.
 */
function tzDayBoundaries(now: Date, timezone: string, days: number): { start: Date; end: Date; dayKey: string }[] {
  const boundaries: { start: Date; end: Date; dayKey: string }[] = [];
  let cursor = now;
  for (let i = 0; i < days; i++) {
    const { start, end } = zonedDayRange(cursor, timezone);
    boundaries.unshift({ start, end, dayKey: toISODate(zonedDayParts(start, timezone)) });
    cursor = new Date(start.getTime() - 1);
  }
  return boundaries;
}

/**
 * The last `days` tz-local calendar days of tracked time (default 10), oldest first, zero-filled so
 * the client always renders exactly `days` entries. A single `listForUserRange` call over the whole
 * window, bucketed in JS — this is a small, already-indexed result set (one user, `days` days), so a
 * Mongo aggregation pipeline would be more code for no measurable benefit at this volume.
 */
export async function getHistory(ctx: WorkspaceContext, days = 10): Promise<HistoryDay[]> {
  const now = new Date();
  const boundaries = tzDayBoundaries(now, ctx.timezone, days);
  const from = boundaries[0]!.start;
  const to = boundaries[boundaries.length - 1]!.end;
  const sessions = await timeSessionRepository.listForUserRange(ctx.workspaceId, ctx.userId, from, to);

  return boundaries.map(({ start, end, dayKey }) => {
    const daySessions = sessions.filter((s) => s.startedAt >= start && s.startedAt < end);
    const totalSeconds = daySessions.reduce((sum, s) => {
      if (s.durationSeconds != null) return sum + s.durationSeconds;
      if (s.endedAt == null) {
        return sum + Math.max(0, Math.floor((now.getTime() - Math.max(s.startedAt.getTime(), start.getTime())) / 1000));
      }
      return sum;
    }, 0);
    return { dayKey, totalSeconds, sessionCount: daySessions.length };
  });
}

/** Recently-tracked activities for the Time Tracker page's "resume" quick-start list. */
export async function getQuickStartActivities(ctx: WorkspaceContext, limit = 8): Promise<Activity[]> {
  return activityRepository.listRecent(ctx.workspaceId, ctx.userId, limit);
}
