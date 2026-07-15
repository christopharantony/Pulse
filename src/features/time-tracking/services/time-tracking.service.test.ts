import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { startTimerForSource, stopTimer } from '@/features/time-tracking/services/time-tracking.service';
import { activityRepository } from '@/features/activity/repositories/activity.repository';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';

function ctx(): WorkspaceContext {
  return {
    userId: new ObjectId(),
    sessionId: 's',
    workspaceId: new ObjectId(),
    timezone: 'UTC',
    weekStartsOn: 1,
  };
}

describe('startTimerForSource', () => {
  it('resolves/creates the Activity lazily via findOrCreateBySource', async () => {
    const c = ctx();
    const habitId = new ObjectId();
    const { session, activity } = await startTimerForSource(c, {
      sourceType: 'habit',
      sourceId: habitId,
      title: 'Meditate',
      color: '#3b82f6',
    });
    expect(activity.sourceType).toBe('habit');
    expect(activity.sourceId?.equals(habitId)).toBe(true);
    expect(session.activityId.equals(activity._id)).toBe(true);
    expect(session.endedAt).toBeNull();
  });

  it('auto-stops a previously running session before starting a new one', async () => {
    const c = ctx();
    const first = await startTimerForSource(c, {
      sourceType: 'habit',
      sourceId: new ObjectId(),
      title: 'Habit A',
    });
    const second = await startTimerForSource(c, {
      sourceType: 'habit',
      sourceId: new ObjectId(),
      title: 'Habit B',
    });

    expect(second.stoppedPrevious?._id.toHexString()).toBe(first.session._id.toHexString());
    const running = await timeSessionRepository.findRunningForUser(c.userId);
    expect(running?._id.toHexString()).toBe(second.session._id.toHexString());
  });
});

describe('stopTimer', () => {
  it('stops the session and rolls the duration into the activity total atomically', async () => {
    const c = ctx();
    const { session, activity } = await startTimerForSource(c, {
      sourceType: 'habit',
      sourceId: new ObjectId(),
      title: 'Run',
    });
    expect(activity.totalTrackedSeconds).toBe(0);

    const result = await stopTimer(c, session._id);
    expect(result.session.endedAt).not.toBeNull();
    expect(result.session.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(result.activity.totalTrackedSeconds).toBe(result.session.durationSeconds);

    // Re-fetch independently to confirm the rollup actually persisted, not just the returned value.
    const persistedActivity = await activityRepository.findById(activity._id);
    expect(persistedActivity?.totalTrackedSeconds).toBe(result.session.durationSeconds);
  });

  it('accumulates totalTrackedSeconds across multiple start/stop cycles on the same source', async () => {
    const c = ctx();
    const habitId = new ObjectId();
    const first = await startTimerForSource(c, { sourceType: 'habit', sourceId: habitId, title: 'Read' });
    const firstStop = await stopTimer(c, first.session._id);

    const second = await startTimerForSource(c, { sourceType: 'habit', sourceId: habitId, title: 'Read' });
    const secondStop = await stopTimer(c, second.session._id);

    expect(secondStop.activity._id.equals(firstStop.activity._id)).toBe(true);
    expect(secondStop.activity.totalTrackedSeconds).toBe(
      (firstStop.session.durationSeconds ?? 0) + (secondStop.session.durationSeconds ?? 0)
    );
  });

  it('is idempotent when stopping an already-stopped session', async () => {
    const c = ctx();
    const { session } = await startTimerForSource(c, { sourceType: 'habit', sourceId: new ObjectId(), title: 'X' });
    const first = await stopTimer(c, session._id);
    const second = await stopTimer(c, session._id);
    expect(second.session.durationSeconds).toBe(first.session.durationSeconds);
    expect(second.activity.totalTrackedSeconds).toBe(first.activity.totalTrackedSeconds);
  });

  it('rejects stopping a session that belongs to another workspace', async () => {
    const owner = ctx();
    const { session } = await startTimerForSource(owner, { sourceType: 'habit', sourceId: new ObjectId(), title: 'X' });
    const intruder = ctx();
    await expect(stopTimer(intruder, session._id)).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });
});
