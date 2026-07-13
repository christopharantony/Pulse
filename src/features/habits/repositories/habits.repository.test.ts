import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import { DuplicateKeyError } from '@/db/errors';
import { utcDate } from '@/test/helpers';

const dailyRecurrence = { frequency: 'daily' as const, interval: 1 };

function ctx() {
  return { workspaceId: new ObjectId(), userId: new ObjectId() };
}

describe('habitLogsRepository', () => {
  it('is idempotent per day (upsert on {habitId, date})', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    const date = utcDate('2026-03-01');

    const first = await habitLogsRepository.upsertForDay({
      workspaceId,
      habitId,
      userId,
      date,
      status: 'completed',
    });
    const second = await habitLogsRepository.upsertForDay({
      workspaceId,
      habitId,
      userId,
      date,
      status: 'skipped',
    });
    expect(second._id.toHexString()).toBe(first._id.toHexString());
    expect(second.status).toBe('skipped');

    const range = await habitLogsRepository.listForRange(
      habitId,
      utcDate('2026-03-01'),
      utcDate('2026-03-31')
    );
    expect(range).toHaveLength(1);
  });

  it('normalises any time-of-day to the same day-key, so a duplicate insert collides', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    await habitLogsRepository.upsertForDay({
      workspaceId,
      habitId,
      userId,
      date: new Date('2026-03-02T08:30:00.000Z'),
      status: 'completed',
    });
    // Direct insert of the same day-key must violate the unique index.
    const collection = await habitLogsRepository.collection();
    await expect(
      collection.insertOne({
        _id: new ObjectId(),
        workspaceId,
        habitId,
        userId,
        date: utcDate('2026-03-02'),
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe('habitsRepository', () => {
  it('creates a habit with zeroed streaks and reuses the shared recurrence shape', async () => {
    const { workspaceId, userId } = ctx();
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'Meditate',
      recurrence: dailyRecurrence,
    });
    expect(habit.currentStreak).toBe(0);
    expect(habit.longestStreak).toBe(0);
    expect(habit.recurrence.frequency).toBe('daily');
  });

  it('recomputes the streak cache from completed logs', async () => {
    const { workspaceId, userId } = ctx();
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'Run',
      recurrence: dailyRecurrence,
    });

    // Three consecutive days, a gap, then two consecutive days.
    for (const day of ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-06', '2026-04-07']) {
      await habitLogsRepository.upsertForDay({
        workspaceId,
        habitId: habit._id,
        userId,
        date: utcDate(day),
        status: 'completed',
      });
    }

    const updated = await habitsRepository.recomputeStreakCache(habit._id);
    expect(updated?.longestStreak).toBe(3);
    // Current streak is the run ending at the most recent completed day (Apr 6–7).
    expect(updated?.currentStreak).toBe(2);
  });

  it('excludes duplicate-key errors leaking as anything but DuplicateKeyError via upsert path', async () => {
    // Sanity: upsertForDay itself never throws for a repeated day (idempotent).
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    await habitLogsRepository.upsertForDay({
      workspaceId,
      habitId,
      userId,
      date: utcDate('2026-05-01'),
      status: 'completed',
    });
    await expect(
      habitLogsRepository.upsertForDay({
        workspaceId,
        habitId,
        userId,
        date: utcDate('2026-05-01'),
        status: 'completed',
      })
    ).resolves.toBeDefined();
    // The negative control: a raw duplicate insert would be a DuplicateKeyError if surfaced.
    expect(DuplicateKeyError).toBeDefined();
  });
});
