import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { analyticsRepository } from '@/features/analytics/repositories/analytics.repository';
import { rollupDay, runRollupsForYesterday } from '@/features/analytics/services/rollup.service';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import { workspaceRepository } from '@/features/workspace/repositories/workspace.repository';
import { zonedDayKey } from '@/lib/time/day';

const DAY = 24 * 60 * 60 * 1000;

/** Mark a task completed at a specific instant (bypassing the "completedAt = now" of updateStatus). */
async function seedCompletedTaskAt(workspaceId: ObjectId, userId: ObjectId, at: Date) {
  const task = await tasksRepository.create(workspaceId, userId, { title: 'Done yesterday' });
  const collection = await tasksRepository.collection();
  await collection.updateOne({ _id: task._id }, { $set: { status: 'completed', completedAt: at } });
}

describe('rollupDay', () => {
  it('aggregates a closed day into a rollup with a score, idempotently', async () => {
    const workspaceId = new ObjectId();
    const userId = new ObjectId();
    const yesterday = new Date(Date.now() - DAY);
    const yesterdayKey = zonedDayKey(yesterday, 'UTC');

    // Two tasks completed yesterday.
    await seedCompletedTaskAt(workspaceId, userId, yesterday);
    await seedCompletedTaskAt(workspaceId, userId, yesterday);

    // A habit completed yesterday.
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'Journal',
      recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    });
    await habitLogsRepository.upsertForDay({
      workspaceId,
      habitId: habit._id,
      userId,
      date: yesterdayKey,
      status: 'completed',
    });

    // A 1-hour focus session yesterday.
    const session = await timeSessionRepository.startSession({
      workspaceId,
      userId,
      activityId: new ObjectId(),
      startedAt: new Date(yesterdayKey.getTime() + 9 * 60 * 60 * 1000),
    });
    await timeSessionRepository.stopSession(
      session._id,
      new Date(yesterdayKey.getTime() + 10 * 60 * 60 * 1000)
    );

    await rollupDay({ workspaceId, userId, timezone: 'UTC', dayInstant: yesterday });

    const rollups = await analyticsRepository.listForRange(
      workspaceId,
      userId,
      yesterdayKey,
      yesterdayKey
    );
    expect(rollups).toHaveLength(1);
    expect(rollups[0].metrics.tasksCompleted).toBe(2);
    expect(rollups[0].metrics.habitsCompleted).toBe(1);
    expect(rollups[0].metrics.trackedSeconds).toBe(3600);
    expect(rollups[0].metrics.focusSessions).toBe(1);
    expect(rollups[0].metrics.productivityScore).toBeGreaterThan(0);

    // Re-running the same day updates in place rather than duplicating.
    await rollupDay({ workspaceId, userId, timezone: 'UTC', dayInstant: yesterday });
    const afterRerun = await analyticsRepository.listForRange(
      workspaceId,
      userId,
      yesterdayKey,
      yesterdayKey
    );
    expect(afterRerun).toHaveLength(1);
  });
});

describe('runRollupsForYesterday', () => {
  it('writes a rollup for each workspace member using their workspace timezone', async () => {
    const userId = new ObjectId();
    const { workspace } = await workspaceRepository.createWithOwner({
      ownerId: userId,
      name: 'Rollup WS',
      slug: `rollup-${new ObjectId().toHexString()}`,
    });

    const yesterday = new Date(Date.now() - DAY);
    await seedCompletedTaskAt(workspace._id, userId, yesterday);

    const { processed } = await runRollupsForYesterday();
    expect(processed).toBeGreaterThanOrEqual(1);

    const yesterdayKey = zonedDayKey(yesterday, workspace.settings.timezone);
    const rollups = await analyticsRepository.listForRange(
      workspace._id,
      userId,
      yesterdayKey,
      yesterdayKey
    );
    expect(rollups).toHaveLength(1);
    expect(rollups[0].metrics.tasksCompleted).toBe(1);
  });
});
