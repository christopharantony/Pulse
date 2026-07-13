import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { activityRepository } from '@/features/activity/repositories/activity.repository';

function ctx() {
  return { workspaceId: new ObjectId(), userId: new ObjectId() };
}

describe('activityRepository', () => {
  it('findOrCreateBySource is idempotent for the same source', async () => {
    const { workspaceId, userId } = ctx();
    const sourceId = new ObjectId();
    const first = await activityRepository.findOrCreateBySource({
      workspaceId,
      userId,
      sourceType: 'task',
      sourceId,
      title: 'Write spec',
    });
    const second = await activityRepository.findOrCreateBySource({
      workspaceId,
      userId,
      sourceType: 'task',
      sourceId,
      title: 'Write spec (renamed since)',
    });
    // Same activity returned — not a duplicate — and the original snapshot is preserved.
    expect(second._id.toHexString()).toBe(first._id.toHexString());
    expect(second.title).toBe('Write spec');
  });

  it('treats different source types with the same id as different activities', async () => {
    const { workspaceId, userId } = ctx();
    const sourceId = new ObjectId();
    const asTask = await activityRepository.findOrCreateBySource({
      workspaceId,
      userId,
      sourceType: 'task',
      sourceId,
      title: 'T',
    });
    const asHabit = await activityRepository.findOrCreateBySource({
      workspaceId,
      userId,
      sourceType: 'habit',
      sourceId,
      title: 'H',
    });
    expect(asTask._id.toHexString()).not.toBe(asHabit._id.toHexString());
  });

  it('creates a distinct activity for every standalone quick-focus/custom call', async () => {
    const { workspaceId, userId } = ctx();
    const a = await activityRepository.createStandalone({
      workspaceId,
      userId,
      sourceType: 'quick_focus',
      title: 'Focus',
    });
    const b = await activityRepository.createStandalone({
      workspaceId,
      userId,
      sourceType: 'quick_focus',
      title: 'Focus',
    });
    // Two null-sourceId activities coexist — the partial unique index does not collapse them.
    expect(a._id.toHexString()).not.toBe(b._id.toHexString());
    expect(a.sourceId).toBeNull();
  });

  it('accumulates tracked time atomically', async () => {
    const { workspaceId, userId } = ctx();
    const activity = await activityRepository.createStandalone({
      workspaceId,
      userId,
      sourceType: 'custom',
      title: 'Reading',
    });
    await activityRepository.incrementTracked(activity._id, 60, new Date());
    await activityRepository.incrementTracked(activity._id, 90, new Date());
    const refreshed = await activityRepository.findById(activity._id);
    expect(refreshed?.totalTrackedSeconds).toBe(150);
    expect(refreshed?.lastTrackedAt).toBeInstanceOf(Date);
  });
});
