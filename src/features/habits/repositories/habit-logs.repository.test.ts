import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import { DuplicateKeyError } from '@/db/errors';
import { utcDate } from '@/test/helpers';

function ctx() {
  return { workspaceId: new ObjectId(), userId: new ObjectId() };
}

describe('habitLogsRepository.upsertForDay', () => {
  it('is idempotent per day (upsert on {habitId, date})', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    const date = utcDate('2026-03-01');

    const first = await habitLogsRepository.upsertForDay({ workspaceId, habitId, userId, date, status: 'completed' });
    const second = await habitLogsRepository.upsertForDay({ workspaceId, habitId, userId, date, status: 'skipped' });
    expect(second._id.toHexString()).toBe(first._id.toHexString());
    expect(second.status).toBe('skipped');

    const range = await habitLogsRepository.listForRange(habitId, utcDate('2026-03-01'), utcDate('2026-03-31'));
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
    const collection = await habitLogsRepository.collection();
    await expect(
      collection.insertOne({
        _id: new ObjectId(),
        workspaceId,
        habitId,
        userId,
        date: utcDate('2026-03-02'),
        status: 'completed',
        value: null,
        checkedItemIds: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ).rejects.toMatchObject({ code: 11000 });
    expect(DuplicateKeyError).toBeDefined();
  });
});

describe('habitLogsRepository.incrementValueForDay', () => {
  it('accumulates value across multiple increments and derives status against the target', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    const date = utcDate('2026-04-01');

    await habitLogsRepository.incrementValueForDay({ workspaceId, habitId, userId, date, deltaValue: 1, targetValue: 3 });
    const second = await habitLogsRepository.incrementValueForDay({ workspaceId, habitId, userId, date, deltaValue: 1, targetValue: 3 });
    expect(second.value).toBe(2);
    expect(second.status).toBe('partial');

    const third = await habitLogsRepository.incrementValueForDay({ workspaceId, habitId, userId, date, deltaValue: 1, targetValue: 3 });
    expect(third.value).toBe(3);
    expect(third.status).toBe('completed');
  });

  it('clamps a decrement that would go negative to zero', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    const date = utcDate('2026-04-02');
    const result = await habitLogsRepository.incrementValueForDay({ workspaceId, habitId, userId, date, deltaValue: -5, targetValue: 3 });
    expect(result.value).toBe(0);
  });
});

describe('habitLogsRepository.setCheckedItemsForDay', () => {
  it('marks completed once all items are checked', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    const date = utcDate('2026-04-03');
    const result = await habitLogsRepository.setCheckedItemsForDay({
      workspaceId,
      habitId,
      userId,
      date,
      checkedItemIds: ['a', 'b'],
      totalItems: 2,
    });
    expect(result?.status).toBe('completed');
  });

  it('deletes the log row when the checked set becomes empty', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    const date = utcDate('2026-04-04');
    await habitLogsRepository.setCheckedItemsForDay({
      workspaceId,
      habitId,
      userId,
      date,
      checkedItemIds: ['a'],
      totalItems: 2,
    });
    const result = await habitLogsRepository.setCheckedItemsForDay({
      workspaceId,
      habitId,
      userId,
      date,
      checkedItemIds: [],
      totalItems: 2,
    });
    expect(result).toBeNull();
    expect(await habitLogsRepository.findForDay(habitId, date)).toBeNull();
  });
});

describe('habitLogsRepository.deleteForDay', () => {
  it('removes a single day log and reports whether one existed', async () => {
    const { workspaceId, userId } = ctx();
    const habitId = new ObjectId();
    const date = utcDate('2026-04-05');
    await habitLogsRepository.upsertForDay({ workspaceId, habitId, userId, date, status: 'completed' });

    expect(await habitLogsRepository.deleteForDay(habitId, date)).toBe(true);
    expect(await habitLogsRepository.findForDay(habitId, date)).toBeNull();
    expect(await habitLogsRepository.deleteForDay(habitId, date)).toBe(false);
  });
});
