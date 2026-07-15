import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';

const dailyRecurrence = { frequency: 'daily' as const, interval: 1, completionBehavior: 'fixed' as const };

function ctx() {
  return { workspaceId: new ObjectId(), userId: new ObjectId() };
}

describe('habitsRepository', () => {
  it('creates a habit with zeroed streak cache and the requested type', async () => {
    const { workspaceId, userId } = ctx();
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'Meditate',
      type: 'boolean',
      recurrence: dailyRecurrence,
    });
    expect(habit.currentStreak).toBe(0);
    expect(habit.longestStreak).toBe(0);
    expect(habit.streakUnit).toBe('day');
    expect(habit.type).toBe('boolean');
    expect(habit.recurrence.frequency).toBe('daily');
  });

  it('creates a numeric habit with its target/unit', async () => {
    const { workspaceId, userId } = ctx();
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'Drink water',
      type: 'numeric',
      recurrence: dailyRecurrence,
      targetValue: 3,
      unit: 'L',
    });
    expect(habit.targetValue).toBe(3);
    expect(habit.unit).toBe('L');
  });

  it('applyStreakCache persists a computed streak patch', async () => {
    const { workspaceId, userId } = ctx();
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'Run',
      type: 'boolean',
      recurrence: dailyRecurrence,
    });
    const updated = await habitsRepository.applyStreakCache(habit._id, {
      currentStreak: 5,
      longestStreak: 7,
      streakUnit: 'day',
      consistencyScore: 42,
      lastLoggedDayKey: new Date('2026-03-01T00:00:00.000Z'),
      streakAnchorDayKey: new Date('2026-02-25T00:00:00.000Z'),
    });
    expect(updated?.currentStreak).toBe(5);
    expect(updated?.longestStreak).toBe(7);
    expect(updated?.consistencyScore).toBe(42);
  });

  it('listFiltered scopes to the workspace and excludes archived/deleted by default', async () => {
    const { workspaceId, userId } = ctx();
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'Journal',
      type: 'boolean',
      recurrence: dailyRecurrence,
    });
    await habitsRepository.create(new ObjectId(), new ObjectId(), {
      name: 'Other workspace habit',
      type: 'boolean',
      recurrence: dailyRecurrence,
    });
    const archived = await habitsRepository.create(workspaceId, userId, {
      name: 'Archived habit',
      type: 'boolean',
      recurrence: dailyRecurrence,
    });
    await habitsRepository.setArchived(archived._id, true);

    const result = await habitsRepository.listFiltered(workspaceId, {}, {}, {});
    const ids = result.items.map((h) => h._id.toHexString());
    expect(ids).toContain(habit._id.toHexString());
    expect(ids).not.toContain(archived._id.toHexString());
  });

  it('listFiltered filters by type', async () => {
    const { workspaceId, userId } = ctx();
    await habitsRepository.create(workspaceId, userId, {
      name: 'Boolean one',
      type: 'boolean',
      recurrence: dailyRecurrence,
    });
    const numeric = await habitsRepository.create(workspaceId, userId, {
      name: 'Numeric one',
      type: 'numeric',
      recurrence: dailyRecurrence,
      targetValue: 5,
    });

    const result = await habitsRepository.listFiltered(workspaceId, { type: ['numeric'] }, {}, {});
    expect(result.items.map((h) => h._id.toHexString())).toEqual([numeric._id.toHexString()]);
  });

  it('soft-deletes into trash and restores', async () => {
    const { workspaceId, userId } = ctx();
    const habit = await habitsRepository.create(workspaceId, userId, {
      name: 'To delete',
      type: 'boolean',
      recurrence: dailyRecurrence,
    });
    await habitsRepository.softDeleteById(habit._id);

    const trash = await habitsRepository.listTrash(workspaceId);
    expect(trash.map((h) => h._id.toHexString())).toContain(habit._id.toHexString());

    const restored = await habitsRepository.restore(habit._id);
    expect(restored?.deletedAt).toBeNull();

    const trashAfter = await habitsRepository.listTrash(workspaceId);
    expect(trashAfter.map((h) => h._id.toHexString())).not.toContain(habit._id.toHexString());
  });
});
