import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { rollupGoalProgressForDay } from '@/features/goals/services/goal-rollup.service';
import { goalProgressSnapshotsRepository } from '@/features/goals/repositories/goal-progress-snapshots.repository';
import { createGoal, updateGoalProgress } from '@/features/goals/services/goals.service';
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

describe('goal-rollup.service', () => {
  it('writes an idempotent snapshot for a goal/day, reflecting current progress', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G', targetValue: 10 }));
    await updateGoalProgress(c, new ObjectId(goal.id), { currentValue: 5 });

    const today = new Date();
    await rollupGoalProgressForDay({ workspaceId: c.workspaceId, goalId: new ObjectId(goal.id), timezone: 'UTC', dayInstant: today });
    await rollupGoalProgressForDay({ workspaceId: c.workspaceId, goalId: new ObjectId(goal.id), timezone: 'UTC', dayInstant: today });

    const snapshots = await goalProgressSnapshotsRepository.listForRange(
      new ObjectId(goal.id),
      new Date(today.getTime() - 24 * 60 * 60 * 1000),
      today
    );
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].progressPct).toBe(50);
    expect(snapshots[0].currentValue).toBe(5);
  });

  it('flags a goal as at-risk when progress has not moved across snapshots', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Stalled', targetValue: 10 }));
    await updateGoalProgress(c, new ObjectId(goal.id), { currentValue: 2 });

    const dayMs = 24 * 60 * 60 * 1000;
    const goalId = new ObjectId(goal.id);
    for (let i = 3; i >= 0; i--) {
      await rollupGoalProgressForDay({
        workspaceId: c.workspaceId,
        goalId,
        timezone: 'UTC',
        dayInstant: new Date(Date.now() - i * dayMs),
      });
    }

    const atRisk = await goalProgressSnapshotsRepository.listAtRiskGoalIds(c.workspaceId, new Date(Date.now() - 5 * dayMs));
    expect(atRisk.map((id) => id.toHexString())).toContain(goalId.toHexString());
  });
});
