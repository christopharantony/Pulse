import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { listGoalActivity } from '@/features/goals/services/goal-activity.service';
import { completeGoal, createGoal, deleteGoal, updateGoal } from '@/features/goals/services/goals.service';
import { addMilestone, completeMilestone, deleteMilestone } from '@/features/goals/services/milestones.service';
import { attachTask, detachTask } from '@/features/goals/services/goal-tasks.service';
import { linkHabit, unlinkHabit } from '@/features/goals/services/goal-habits.service';
import { createGoalSchema } from '@/features/goals/validators/goals.schema';
import { createTask, completeTask } from '@/features/tasks/services/tasks.service';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
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

describe('goal activity log', () => {
  it('records created/updated/completed/deleted for basic goal CRUD', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const goalId = new ObjectId(goal.id);

    await updateGoal(c, goalId, { title: 'Renamed' });
    await completeGoal(c, goalId);
    await deleteGoal(c, goalId);

    const activity = await listGoalActivity(c, goalId);
    const types = activity.map((a) => a.type);
    expect(types).toContain('created');
    expect(types).toContain('updated');
    expect(types).toContain('status_changed');
    expect(types).toContain('completed');
    expect(types).toContain('deleted');
  });

  it('records milestone lifecycle events', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G', progressMethod: 'milestone' }));
    const goalId = new ObjectId(goal.id);
    const milestone = await addMilestone(c, goalId, { title: 'M1' });
    await completeMilestone(c, goalId, new ObjectId(milestone.id));
    await deleteMilestone(c, goalId, new ObjectId(milestone.id));

    const types = (await listGoalActivity(c, goalId)).map((a) => a.type);
    expect(types).toContain('milestone_added');
    expect(types).toContain('milestone_completed');
    expect(types).toContain('milestone_deleted');
  });

  it('records task_attached/task_completed/task_detached', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G', progressMethod: 'task' }));
    const goalId = new ObjectId(goal.id);
    const task = await createTask(c, { title: 'T' } as never);

    await attachTask(c, goalId, task._id);
    await completeTask(c, task._id);
    await detachTask(c, goalId, task._id);

    const types = (await listGoalActivity(c, goalId)).map((a) => a.type);
    expect(types).toContain('task_attached');
    expect(types).toContain('task_completed');
    expect(types).toContain('task_detached');
  });

  it('records habit_linked/habit_unlinked', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const goalId = new ObjectId(goal.id);
    const habit = await habitsRepository.create(c.workspaceId, c.userId, {
      name: 'Read',
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    });

    await linkHabit(c, goalId, habit._id, { contributionType: 'count', contributionWeight: 1 });
    await unlinkHabit(c, goalId, habit._id);

    const types = (await listGoalActivity(c, goalId)).map((a) => a.type);
    expect(types).toContain('habit_linked');
    expect(types).toContain('habit_unlinked');
  });

  it('only returns activity scoped to the goal', async () => {
    const c = ctx();
    const goalA = await createGoal(c, createGoalSchema.parse({ title: 'A' }));
    const goalB = await createGoal(c, createGoalSchema.parse({ title: 'B' }));

    const activityA = await listGoalActivity(c, new ObjectId(goalA.id));
    expect(activityA.every((a) => a.goalId === goalA.id)).toBe(true);
    expect(activityA.some((a) => a.goalId === goalB.id)).toBe(false);
  });
});
