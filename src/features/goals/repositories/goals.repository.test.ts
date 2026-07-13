import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';

describe('goalsRepository', () => {
  it('creates an active goal by default and filters by status', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    const active = await goalsRepository.create(workspaceId, createdBy, { name: 'Ship v1' });
    const done = await goalsRepository.create(workspaceId, createdBy, {
      name: 'Old goal',
      status: 'completed',
    });

    expect(active.status).toBe('active');
    expect(active.currentValue).toBe(0);

    const activeList = await goalsRepository.listByWorkspace(workspaceId, { status: 'active' });
    expect(activeList.items.map((g) => g._id.toHexString())).toEqual([active._id.toHexString()]);

    const completedList = await goalsRepository.listByWorkspace(workspaceId, {
      status: 'completed',
    });
    expect(completedList.items.map((g) => g._id.toHexString())).toEqual([done._id.toHexString()]);
  });

  it('updates status', async () => {
    const workspaceId = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, new ObjectId(), { name: 'G' });
    const updated = await goalsRepository.setStatus(goal._id, 'completed');
    expect(updated?.status).toBe('completed');
  });
});
