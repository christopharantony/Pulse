import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { createGoal, startGoalTimer, stopGoalTimer } from '@/features/goals/services/goals.service';
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

describe('goal timer (Activity Engine integration)', () => {
  it('starts a timer against a goal, lazily creating its Activity with sourceType "goal"', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Write a book', color: '#3b82f6' }));

    const { session, activity } = await startGoalTimer(c, new ObjectId(goal.id), {});
    expect(activity.sourceType).toBe('goal');
    expect(activity.sourceId?.toHexString()).toBe(goal.id);
    expect(activity.title).toBe('Write a book');
    expect(session.endedAt).toBeNull();
  });

  it('stops a running goal timer and rolls the duration into the activity', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const { session } = await startGoalTimer(c, new ObjectId(goal.id), {});

    const result = await stopGoalTimer(c, new ObjectId(goal.id), session._id);
    expect(result.session.endedAt).not.toBeNull();
    expect(result.activity.totalTrackedSeconds).toBeGreaterThanOrEqual(0);
  });

  it('rejects starting a timer against a goal in another workspace', async () => {
    const owner = ctx();
    const goal = await createGoal(owner, createGoalSchema.parse({ title: 'Private' }));

    const intruder = ctx();
    await expect(startGoalTimer(intruder, new ObjectId(goal.id), {})).rejects.toMatchObject({ status: 404 });
  });
});
