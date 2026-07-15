import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { attachTask, countTasksByGoal, detachTask, GoalTaskError, listGoalTasks } from '@/features/goals/services/goal-tasks.service';
import { createGoal } from '@/features/goals/services/goals.service';
import { createGoalSchema } from '@/features/goals/validators/goals.schema';
import { createTask } from '@/features/tasks/services/tasks.service';
import { getTask } from '@/features/tasks/services/tasks.service';
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

describe('goal-tasks.service', () => {
  it('attaches and detaches a task, updating counts', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Ship v1', progressMethod: 'task' }));
    const goalId = new ObjectId(goal.id);
    const task = await createTask(c, { title: 'Write tests', status: 'completed' } as never);

    await attachTask(c, goalId, task._id);
    const linked = await getTask(c, task._id);
    expect(linked.goalId?.equals(goalId)).toBe(true);

    const counts = await countTasksByGoal(c, goalId);
    expect(counts).toEqual({ completed: 1, overdue: 0, remaining: 0, total: 1 });

    const result = await listGoalTasks(c, goalId);
    expect(result.items).toHaveLength(1);
    expect(result.counts.total).toBe(1);

    await detachTask(c, goalId, task._id);
    const unlinked = await getTask(c, task._id);
    expect(unlinked.goalId).toBeNull();
  });

  it('rejects attaching a task already linked to a different goal', async () => {
    const c = ctx();
    const goalA = await createGoal(c, createGoalSchema.parse({ title: 'A' }));
    const goalB = await createGoal(c, createGoalSchema.parse({ title: 'B' }));
    const task = await createTask(c, { title: 'T' } as never);

    await attachTask(c, new ObjectId(goalA.id), task._id);
    await expect(attachTask(c, new ObjectId(goalB.id), task._id)).rejects.toBeInstanceOf(GoalTaskError);
  });

  it('rejects detaching a task that is not linked to the given goal', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const task = await createTask(c, { title: 'T' } as never);

    await expect(detachTask(c, new ObjectId(goal.id), task._id)).rejects.toBeInstanceOf(GoalTaskError);
  });

  it('recomputes task-based progress as linked tasks complete', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Ship v1', progressMethod: 'task' }));
    const goalId = new ObjectId(goal.id);
    const done = await createTask(c, { title: 'Done', status: 'completed' } as never);
    const pending = await createTask(c, { title: 'Pending' } as never);

    await attachTask(c, goalId, done._id);
    await attachTask(c, goalId, pending._id);

    const counts = await countTasksByGoal(c, goalId);
    expect(counts.completed).toBe(1);
    expect(counts.total).toBe(2);
  });
});
