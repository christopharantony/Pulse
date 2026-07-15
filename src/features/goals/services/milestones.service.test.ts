import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  addMilestone,
  completeMilestone,
  deleteMilestone,
  listMilestones,
  MilestoneError,
  reorderMilestones,
  updateMilestone,
} from '@/features/goals/services/milestones.service';
import { createGoal } from '@/features/goals/services/goals.service';
import { createGoalSchema } from '@/features/goals/validators/goals.schema';
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

describe('milestones.service', () => {
  it('adds milestones in order and lists them for the goal', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Write a book' }));
    const goalId = new ObjectId(goal.id);

    await addMilestone(c, goalId, { title: 'Outline' });
    await addMilestone(c, goalId, { title: 'First draft' });

    const list = await listMilestones(c, goalId);
    expect(list.map((m) => m.title)).toEqual(['Outline', 'First draft']);
    expect(list.map((m) => m.order)).toEqual([0, 1]);
  });

  it('completing a milestone recomputes progress when the goal uses the milestone method', async () => {
    const c = ctx();
    const goal = await createGoal(
      c,
      createGoalSchema.parse({ title: 'Write a book', progressMethod: 'milestone' })
    );
    const goalId = new ObjectId(goal.id);

    const m1 = await addMilestone(c, goalId, { title: 'Outline' });
    await addMilestone(c, goalId, { title: 'First draft' });

    const completed = await completeMilestone(c, goalId, new ObjectId(m1.id));
    expect(completed.status).toBe('completed');

    const list = await listMilestones(c, goalId);
    expect(list.find((m) => m.id === m1.id)?.status).toBe('completed');
  });

  it('updates and deletes a milestone', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const goalId = new ObjectId(goal.id);
    const m = await addMilestone(c, goalId, { title: 'Original' });

    const updated = await updateMilestone(c, goalId, new ObjectId(m.id), { title: 'Renamed' });
    expect(updated.title).toBe('Renamed');

    await deleteMilestone(c, goalId, new ObjectId(m.id));
    const list = await listMilestones(c, goalId);
    expect(list).toHaveLength(0);
  });

  it('reorders milestones for a goal', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const goalId = new ObjectId(goal.id);
    const a = await addMilestone(c, goalId, { title: 'A' });
    const b = await addMilestone(c, goalId, { title: 'B' });

    const reordered = await reorderMilestones(c, goalId, [new ObjectId(b.id), new ObjectId(a.id)]);
    expect(reordered.map((m) => m.title)).toEqual(['B', 'A']);
  });

  it('rejects operating on a milestone that does not belong to the given goal', async () => {
    const c = ctx();
    const goalA = await createGoal(c, createGoalSchema.parse({ title: 'A' }));
    const goalB = await createGoal(c, createGoalSchema.parse({ title: 'B' }));
    const milestone = await addMilestone(c, new ObjectId(goalA.id), { title: 'M' });

    await expect(
      updateMilestone(c, new ObjectId(goalB.id), new ObjectId(milestone.id), { title: 'Hijacked' })
    ).rejects.toBeInstanceOf(MilestoneError);
  });
});
