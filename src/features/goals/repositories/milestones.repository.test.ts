import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';

describe('milestonesRepository', () => {
  it('creates milestones with an incrementing order and lists them for a goal', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();

    const first = await milestonesRepository.create(workspaceId, goalId, {
      title: 'Draft outline',
      order: await milestonesRepository.nextOrderValue(goalId),
    });
    const second = await milestonesRepository.create(workspaceId, goalId, {
      title: 'Finish draft',
      order: await milestonesRepository.nextOrderValue(goalId),
    });

    expect(first.order).toBe(0);
    expect(second.order).toBe(1);

    const result = await milestonesRepository.listByGoal(goalId);
    expect(result.items).toHaveLength(2);
  });

  it('reorders milestones in one bulk write', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    const a = await milestonesRepository.create(workspaceId, goalId, { title: 'A', order: 0 });
    const b = await milestonesRepository.create(workspaceId, goalId, { title: 'B', order: 1 });

    await milestonesRepository.reorder(goalId, [b._id, a._id]);

    const reordered = await milestonesRepository.findById(b._id);
    const other = await milestonesRepository.findById(a._id);
    expect(reordered?.order).toBe(0);
    expect(other?.order).toBe(1);
  });

  it('tracks completed/total counts for the milestone-based progress method', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    const a = await milestonesRepository.create(workspaceId, goalId, { title: 'A', order: 0 });
    await milestonesRepository.create(workspaceId, goalId, { title: 'B', order: 1 });

    await milestonesRepository.setStatus(a._id, 'completed');

    const counts = await milestonesRepository.countByGoal(goalId);
    expect(counts).toEqual({ completed: 1, total: 2 });
  });

  it('finds milestones due within a range across the workspace', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const farAway = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await milestonesRepository.create(workspaceId, goalId, { title: 'Due soon', order: 0, dueDate: soon });
    await milestonesRepository.create(workspaceId, goalId, { title: 'Far away', order: 1, dueDate: farAway });

    const upcoming = await milestonesRepository.listUpcoming(workspaceId, {
      from: new Date(),
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(upcoming.map((m) => m.title)).toEqual(['Due soon']);
  });

  it('deletes all milestones for a goal (permanent-delete cascade)', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    await milestonesRepository.create(workspaceId, goalId, { title: 'A', order: 0 });
    await milestonesRepository.create(workspaceId, goalId, { title: 'B', order: 1 });

    await milestonesRepository.deleteAllForGoal(goalId);

    const result = await milestonesRepository.listByGoal(goalId, { includeDeleted: true });
    expect(result.items).toHaveLength(0);
  });
});
