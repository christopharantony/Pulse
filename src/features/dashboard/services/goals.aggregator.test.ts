import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { buildGoalsSummary } from '@/features/dashboard/services/goals.aggregator';
import { completeGoal, createGoal, updateGoalProgress } from '@/features/goals/services/goals.service';
import { addMilestone } from '@/features/goals/services/milestones.service';
import { rollupGoalProgressForDay } from '@/features/goals/services/goal-rollup.service';
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

describe('buildGoalsSummary', () => {
  it('counts active/completed goals and computes an average progress', async () => {
    const c = ctx();
    const active = await createGoal(c, createGoalSchema.parse({ title: 'Active', targetValue: 10 }));
    await updateGoalProgress(c, new ObjectId(active.id), { currentValue: 4 });
    const completed = await createGoal(c, createGoalSchema.parse({ title: 'Done' }));
    await completeGoal(c, new ObjectId(completed.id));

    const summary = await buildGoalsSummary(c);
    expect(summary.activeCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.averageProgressPct).toBe(40);
  });

  it('surfaces milestones due within the upcoming window', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Ship v1' }));
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await addMilestone(c, new ObjectId(goal.id), { title: 'Beta', dueDate: soon });

    const summary = await buildGoalsSummary(c);
    expect(summary.upcomingMilestones).toHaveLength(1);
    expect(summary.upcomingMilestones[0].goalTitle).toBe('Ship v1');
  });

  it('sorts active goals by nearest targetDate for goal deadlines', async () => {
    const c = ctx();
    const far = await createGoal(
      c,
      createGoalSchema.parse({ title: 'Far', targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) })
    );
    const near = await createGoal(
      c,
      createGoalSchema.parse({ title: 'Near', targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) })
    );

    const summary = await buildGoalsSummary(c);
    expect(summary.goalDeadlines.map((g) => g.title)).toEqual(['Near', 'Far']);
    void far;
  });

  it('flags stalled goals as at risk', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Stalled', targetValue: 10 }));
    await updateGoalProgress(c, new ObjectId(goal.id), { currentValue: 1 });

    const dayMs = 24 * 60 * 60 * 1000;
    for (let i = 20; i >= 0; i -= 5) {
      await rollupGoalProgressForDay({
        workspaceId: c.workspaceId,
        goalId: new ObjectId(goal.id),
        timezone: 'UTC',
        dayInstant: new Date(Date.now() - i * dayMs),
      });
    }

    const summary = await buildGoalsSummary(c);
    expect(summary.atRisk.map((g) => g.title)).toContain('Stalled');
  });
});
