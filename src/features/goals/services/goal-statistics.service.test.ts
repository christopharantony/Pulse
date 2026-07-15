import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { getGoalsOverviewStatistics, getGoalStatistics } from '@/features/goals/services/goal-statistics.service';
import { completeGoal, createGoal } from '@/features/goals/services/goals.service';
import { addMilestone, completeMilestone } from '@/features/goals/services/milestones.service';
import { attachTask } from '@/features/goals/services/goal-tasks.service';
import { createGoalSchema } from '@/features/goals/validators/goals.schema';
import { createTask, completeTask } from '@/features/tasks/services/tasks.service';
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

describe('getGoalStatistics', () => {
  it('reports milestone/task counts and progress for a single goal', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Ship v1', progressMethod: 'milestone' }));
    const goalId = new ObjectId(goal.id);
    const m1 = await addMilestone(c, goalId, { title: 'M1' });
    await addMilestone(c, goalId, { title: 'M2' });
    await completeMilestone(c, goalId, new ObjectId(m1.id));

    const task = await createTask(c, { title: 'T' } as never);
    await attachTask(c, goalId, task._id);

    const stats = await getGoalStatistics(c, goalId);
    expect(stats.milestonesCompleted).toBe(1);
    expect(stats.milestonesTotal).toBe(2);
    expect(stats.tasksTotal).toBe(1);
    expect(stats.progressPct).toBe(50);
  });

  it('has no onTrack projection without both a startDate and targetDate', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const stats = await getGoalStatistics(c, new ObjectId(goal.id));
    expect(stats.onTrack).toBeNull();
    expect(stats.daysRemaining).toBeNull();
  });
});

describe('getGoalsOverviewStatistics', () => {
  it('aggregates completion rate, goal counts, and workspace-wide task/milestone completion', async () => {
    const c = ctx();
    const done = await createGoal(c, createGoalSchema.parse({ title: 'Done' }));
    await completeGoal(c, new ObjectId(done.id));
    await createGoal(c, createGoalSchema.parse({ title: 'Active' }));

    const task = await createTask(c, { title: 'T', status: 'completed' } as never);
    const goalWithTask = await createGoal(c, createGoalSchema.parse({ title: 'Has task' }));
    await attachTask(c, new ObjectId(goalWithTask.id), task._id);

    const overview = await getGoalsOverviewStatistics(c);
    expect(overview.goalsCreated).toBe(3);
    expect(overview.goalsCompleted).toBe(1);
    expect(overview.completionRate).toBe(100); // 1 completed, 0 cancelled
    expect(overview.taskCompletionRate).toBe(100); // the only goal-linked task is completed
  });

  it('scopes statistics to the caller workspace', async () => {
    const c = ctx();
    await createGoal(c, createGoalSchema.parse({ title: 'Mine' }));

    const other = ctx();
    const overview = await getGoalsOverviewStatistics(other);
    expect(overview.goalsCreated).toBe(0);
  });
});
