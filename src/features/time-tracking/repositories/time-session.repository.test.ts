import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import { activityRepository } from '@/features/activity/repositories/activity.repository';
import { DuplicateKeyError } from '@/db/errors';

function ctx() {
  return { workspaceId: new ObjectId(), userId: new ObjectId() };
}

describe('timeSessionRepository', () => {
  it('starts a session against a Task-sourced activity (Activity decouples the source)', async () => {
    const { workspaceId, userId } = ctx();
    // A task-sourced activity: time-tracking never references the Task itself, only the Activity.
    const activity = await activityRepository.findOrCreateBySource({
      workspaceId,
      userId,
      sourceType: 'task',
      sourceId: new ObjectId(),
      title: 'Task A',
    });
    const session = await timeSessionRepository.startSession({
      workspaceId,
      userId,
      activityId: activity._id,
    });
    expect(session.endedAt).toBeNull();
    expect(session.durationSeconds).toBeNull();

    const running = await timeSessionRepository.findRunningForUser(userId);
    expect(running?._id.toHexString()).toBe(session._id.toHexString());
  });

  it('enforces at most one running timer per user (partial unique index)', async () => {
    const { workspaceId, userId } = ctx();
    const activityId = new ObjectId();
    await timeSessionRepository.startSession({ workspaceId, userId, activityId });
    // A second start for the same user, regardless of activity/source, must be rejected.
    await expect(
      timeSessionRepository.startSession({ workspaceId, userId, activityId: new ObjectId() })
    ).rejects.toBeInstanceOf(DuplicateKeyError);
  });

  it('allows a new timer once the previous one is stopped', async () => {
    const { workspaceId, userId } = ctx();
    const first = await timeSessionRepository.startSession({
      workspaceId,
      userId,
      activityId: new ObjectId(),
    });
    await timeSessionRepository.stopSession(first._id);
    // No longer running, so a fresh start succeeds.
    const second = await timeSessionRepository.startSession({
      workspaceId,
      userId,
      activityId: new ObjectId(),
    });
    expect(second._id.toHexString()).not.toBe(first._id.toHexString());
  });

  it('computes durationSeconds on stop', async () => {
    const { workspaceId, userId } = ctx();
    const startedAt = new Date('2026-01-01T10:00:00.000Z');
    const endedAt = new Date('2026-01-01T10:25:00.000Z');
    const session = await timeSessionRepository.startSession({
      workspaceId,
      userId,
      activityId: new ObjectId(),
      startedAt,
    });
    const stopped = await timeSessionRepository.stopSession(session._id, endedAt);
    expect(stopped?.endedAt?.getTime()).toBe(endedAt.getTime());
    expect(stopped?.durationSeconds).toBe(25 * 60);
  });

  it('lists a user timesheet within a date range', async () => {
    const { workspaceId, userId } = ctx();
    const activityId = new ObjectId();
    const jan = await timeSessionRepository.startSession({
      workspaceId,
      userId,
      activityId,
      startedAt: new Date('2026-01-10T09:00:00.000Z'),
    });
    await timeSessionRepository.stopSession(jan._id, new Date('2026-01-10T10:00:00.000Z'));
    const feb = await timeSessionRepository.startSession({
      workspaceId,
      userId,
      activityId,
      startedAt: new Date('2026-02-10T09:00:00.000Z'),
    });
    await timeSessionRepository.stopSession(feb._id, new Date('2026-02-10T10:00:00.000Z'));

    const janOnly = await timeSessionRepository.listForUserRange(
      workspaceId,
      userId,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-31T23:59:59.000Z')
    );
    expect(janOnly).toHaveLength(1);
    expect(janOnly[0]._id.toHexString()).toBe(jan._id.toHexString());
  });
});
