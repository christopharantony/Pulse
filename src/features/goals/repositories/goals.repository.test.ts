import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';

describe('goalsRepository', () => {
  it('creates a not_started goal by default and filters by status', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    const active = await goalsRepository.create(workspaceId, createdBy, { title: 'Ship v1', status: 'active' });
    const done = await goalsRepository.create(workspaceId, createdBy, {
      title: 'Old goal',
      status: 'completed',
    });

    expect(active.status).toBe('active');
    expect(active.currentValue).toBe(0);
    expect(active.category).toBe('personal');
    expect(active.priority).toBe('medium');
    expect(active.progressMethod).toBe('manual');
    expect(active.visibility).toBe('workspace');

    const activeList = await goalsRepository.listByWorkspace(workspaceId, { status: 'active' });
    expect(activeList.items.map((g) => g._id.toHexString())).toEqual([active._id.toHexString()]);

    const completedList = await goalsRepository.listByWorkspace(workspaceId, {
      status: 'completed',
    });
    expect(completedList.items.map((g) => g._id.toHexString())).toEqual([done._id.toHexString()]);
  });

  it('defaults to not_started when no status is given', async () => {
    const workspaceId = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, new ObjectId(), { title: 'Learn Spanish' });
    expect(goal.status).toBe('not_started');
  });

  it('updates status', async () => {
    const workspaceId = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, new ObjectId(), { title: 'G' });
    const updated = await goalsRepository.setStatus(goal._id, 'completed');
    expect(updated?.status).toBe('completed');
  });

  it('archives and unarchives, tracking archivedAt', async () => {
    const workspaceId = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, new ObjectId(), { title: 'G' });

    const archived = await goalsRepository.setArchived(goal._id, true);
    expect(archived?.status).toBe('archived');
    expect(archived?.archivedAt).not.toBeNull();

    const unarchived = await goalsRepository.setArchived(goal._id, false);
    expect(unarchived?.status).toBe('active');
    expect(unarchived?.archivedAt).toBeNull();
  });

  it('filters, sorts, and paginates via listFiltered', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    await goalsRepository.create(workspaceId, createdBy, { title: 'Low priority', priority: 'low' });
    await goalsRepository.create(workspaceId, createdBy, { title: 'High priority', priority: 'high' });

    const result = await goalsRepository.listFiltered(
      workspaceId,
      { priority: ['high'] },
      {},
      {}
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('High priority');
  });

  it('moves a goal through soft-delete, trash listing, and restore', async () => {
    const workspaceId = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, new ObjectId(), { title: 'Trash me' });

    await goalsRepository.softDeleteById(goal._id);
    const trashed = await goalsRepository.listTrash(workspaceId);
    expect(trashed.map((g) => g._id.toHexString())).toContain(goal._id.toHexString());

    const restored = await goalsRepository.restore(goal._id);
    expect(restored?.deletedAt).toBeNull();
  });
});
