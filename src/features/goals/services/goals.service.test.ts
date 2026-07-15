import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  archiveGoal,
  completeGoal,
  createGoal,
  deleteGoal,
  getGoalDetail,
  GoalError,
  permanentlyDeleteGoal,
  restoreGoal,
  unarchiveGoal,
  updateGoal,
  updateGoalProgress,
  updateGoalStatus,
} from '@/features/goals/services/goals.service';
import { createGoalSchema, type CreateGoalInput } from '@/features/goals/validators/goals.schema';
import { AppError } from '@/lib/app-error';
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

/** Parse minimal input through the real schema so defaults (status/priority/category/...) apply. */
function input(overrides: Partial<CreateGoalInput> & { title: string }): CreateGoalInput {
  return createGoalSchema.parse(overrides);
}

describe('goals.service', () => {
  it('creates a goal with defaults and returns a DTO', async () => {
    const c = ctx();
    const goal = await createGoal(c, input({ title: 'Read 24 books' }));

    expect(goal.title).toBe('Read 24 books');
    expect(goal.status).toBe('not_started');
    expect(goal.category).toBe('personal');
    expect(goal.priority).toBe('medium');
    expect(goal.progressPct).toBe(0);
  });

  it('updates fields via the generic update path', async () => {
    const c = ctx();
    const goal = await createGoal(c, input({ title: 'G' }));
    const updated = await updateGoal(c, new ObjectId(goal.id), { title: 'Renamed' });
    expect(updated.title).toBe('Renamed');
  });

  it('completeGoal sets status and completionDate; reactivation clears it', async () => {
    const c = ctx();
    const goal = await createGoal(c, input({ title: 'G' }));
    const completed = await completeGoal(c, new ObjectId(goal.id));
    expect(completed.status).toBe('completed');
    expect(completed.completionDate).not.toBeNull();

    const reactivated = await updateGoalStatus(c, new ObjectId(goal.id), 'active');
    expect(reactivated.completionDate).toBeNull();
  });

  it('archiveGoal/unarchiveGoal round-trip status and archivedAt', async () => {
    const c = ctx();
    const goal = await createGoal(c, input({ title: 'G' }));
    const archived = await archiveGoal(c, new ObjectId(goal.id));
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).not.toBeNull();

    const unarchived = await unarchiveGoal(c, new ObjectId(goal.id));
    expect(unarchived.status).toBe('active');
    expect(unarchived.archivedAt).toBeNull();
  });

  it('updateGoalProgress computes progressPct against targetValue', async () => {
    const c = ctx();
    const goal = await createGoal(c, input({ title: 'Read 24 books', targetValue: 24 }));
    const updated = await updateGoalProgress(c, new ObjectId(goal.id), { currentValue: 12 });
    expect(updated.progressPct).toBe(50);
  });

  it('rejects permanent delete unless the goal is already trashed', async () => {
    const c = ctx();
    const goal = await createGoal(c, input({ title: 'G' }));
    await expect(permanentlyDeleteGoal(c, new ObjectId(goal.id))).rejects.toBeInstanceOf(GoalError);

    await deleteGoal(c, new ObjectId(goal.id));
    await permanentlyDeleteGoal(c, new ObjectId(goal.id));
    await expect(getGoalDetail(c, new ObjectId(goal.id))).rejects.toMatchObject({ status: 404 });
  });

  it('restores a trashed goal', async () => {
    const c = ctx();
    const goal = await createGoal(c, input({ title: 'G' }));
    await deleteGoal(c, new ObjectId(goal.id));
    const restored = await restoreGoal(c, new ObjectId(goal.id));
    expect(restored.id).toBe(goal.id);
  });

  it('rejects accessing a goal in another workspace with a 404', async () => {
    const owner = ctx();
    const goal = await createGoal(owner, input({ title: 'Private' }));

    const intruder = ctx();
    await expect(getGoalDetail(intruder, new ObjectId(goal.id))).rejects.toBeInstanceOf(AppError);
    await expect(getGoalDetail(intruder, new ObjectId(goal.id))).rejects.toMatchObject({ status: 404 });
  });
});
