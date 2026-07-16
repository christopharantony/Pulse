import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  getHistory,
  getRunningSession,
  getTodaySummary,
} from '@/features/time-tracking/services/time-tracking-summary.service';
import { activityRepository } from '@/features/activity/repositories/activity.repository';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { zonedDayRange, toISODate, zonedDayParts } from '@/lib/time/day';

function ctx(): WorkspaceContext {
  return {
    userId: new ObjectId(),
    sessionId: 's',
    workspaceId: new ObjectId(),
    timezone: 'UTC',
    weekStartsOn: 1,
  };
}

async function makeActivity(c: WorkspaceContext, title = 'Focus') {
  return activityRepository.createStandalone({
    workspaceId: c.workspaceId,
    userId: c.userId,
    sourceType: 'quick_focus',
    title,
  });
}

describe('getRunningSession', () => {
  it('returns null when nothing is running', async () => {
    const c = ctx();
    expect(await getRunningSession(c)).toBeNull();
  });

  it('returns the running session and its activity', async () => {
    const c = ctx();
    const activity = await makeActivity(c);
    const session = await timeSessionRepository.startSession({
      workspaceId: c.workspaceId,
      userId: c.userId,
      activityId: activity._id,
    });

    const running = await getRunningSession(c);
    expect(running?.session._id.equals(session._id)).toBe(true);
    expect(running?.activity._id.equals(activity._id)).toBe(true);
  });
});

describe('getTodaySummary', () => {
  it('sums completed sessions and adds live elapsed time for a session running today', async () => {
    const c = ctx();
    const activity = await makeActivity(c);
    const now = Date.now();

    // A completed session earlier today: 1 hour ago -> 30 minutes ago (1800s).
    const completed = await timeSessionRepository.startSession({
      workspaceId: c.workspaceId,
      userId: c.userId,
      activityId: activity._id,
      startedAt: new Date(now - 3600_000),
    });
    await timeSessionRepository.stopSession(completed._id, new Date(now - 1800_000));

    // A session still running, started 2 minutes ago.
    await timeSessionRepository.startSession({
      workspaceId: c.workspaceId,
      userId: c.userId,
      activityId: activity._id,
      startedAt: new Date(now - 120_000),
    });

    const summary = await getTodaySummary(c);
    expect(summary.completedSeconds).toBe(1800);
    expect(summary.sessionCount).toBe(2);
    expect(summary.runningStartedAt).not.toBeNull();
    expect(new Date(summary.runningStartedAt!).getTime()).toBeCloseTo(now - 120_000, -2);
  });

  it('clamps a session still running from yesterday to only its today-portion', async () => {
    const c = ctx();
    const activity = await makeActivity(c);
    const { start: todayStart } = zonedDayRange(new Date(), c.timezone);

    // Started 5 hours before today's midnight boundary, still running.
    await timeSessionRepository.startSession({
      workspaceId: c.workspaceId,
      userId: c.userId,
      activityId: activity._id,
      startedAt: new Date(todayStart.getTime() - 5 * 3600_000),
    });

    const summary = await getTodaySummary(c);
    expect(summary.runningStartedAt).toBe(todayStart.toISOString());
  });

  it('returns zero/null when nothing was tracked today', async () => {
    const c = ctx();
    const summary = await getTodaySummary(c);
    expect(summary).toEqual({ completedSeconds: 0, runningStartedAt: null, sessionCount: 0 });
  });
});

describe('getHistory', () => {
  it('zero-fills empty days and returns exactly `days` entries, oldest first', async () => {
    const c = ctx();
    const history = await getHistory(c, 10);
    expect(history).toHaveLength(10);
    expect(history.every((day) => day.totalSeconds === 0 && day.sessionCount === 0)).toBe(true);

    const todayKey = toISODate(zonedDayParts(new Date(), c.timezone));
    expect(history[history.length - 1]!.dayKey).toBe(todayKey);
  });

  it('buckets a session that starts just before the tz-day boundary into the correct (earlier) day', async () => {
    const c = ctx();
    const activity = await makeActivity(c);
    const { start: todayStart } = zonedDayRange(new Date(), c.timezone);

    // Entirely within "yesterday": a 5-second session ending just before midnight.
    const session = await timeSessionRepository.startSession({
      workspaceId: c.workspaceId,
      userId: c.userId,
      activityId: activity._id,
      startedAt: new Date(todayStart.getTime() - 5000),
    });
    await timeSessionRepository.stopSession(session._id, new Date(todayStart.getTime() - 1));

    const history = await getHistory(c, 10);
    const todayKey = toISODate(zonedDayParts(new Date(), c.timezone));
    const yesterdayKey = toISODate(zonedDayParts(new Date(todayStart.getTime() - 5000), c.timezone));

    const todayEntry = history.find((day) => day.dayKey === todayKey);
    const yesterdayEntry = history.find((day) => day.dayKey === yesterdayKey);

    expect(yesterdayEntry?.sessionCount).toBe(1);
    expect(yesterdayEntry?.totalSeconds).toBeGreaterThan(0);
    expect(todayEntry?.sessionCount).toBe(0);
  });
});
