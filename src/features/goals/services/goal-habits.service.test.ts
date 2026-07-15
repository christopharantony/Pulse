import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  computeHabitContribution,
  GoalHabitError,
  linkHabit,
  listLinkedHabits,
  unlinkHabit,
  updateHabitContribution,
} from '@/features/goals/services/goal-habits.service';
import { createGoal, getGoalDetail } from '@/features/goals/services/goals.service';
import { createGoalSchema } from '@/features/goals/validators/goals.schema';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { zonedDayKey } from '@/lib/time/day';

function ctx(): WorkspaceContext {
  return {
    userId: new ObjectId(),
    sessionId: 's',
    workspaceId: new ObjectId(),
    timezone: 'UTC',
    weekStartsOn: 1,
  };
}

async function booleanHabit(c: WorkspaceContext, name: string) {
  return habitsRepository.create(c.workspaceId, c.userId, {
    name,
    type: 'boolean',
    recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
  });
}

describe('goal-habits.service', () => {
  it('links and lists habits for a goal', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'Read 24 books' }));
    const habit = await booleanHabit(c, 'Read every day');

    await linkHabit(c, new ObjectId(goal.id), habit._id, { contributionType: 'count', contributionWeight: 1 });
    const links = await listLinkedHabits(c, new ObjectId(goal.id));
    expect(links).toHaveLength(1);
    expect(links[0].habitId).toBe(habit._id.toHexString());
  });

  it('rejects linking the same habit to a goal twice', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const habit = await booleanHabit(c, 'H');

    await linkHabit(c, new ObjectId(goal.id), habit._id, { contributionType: 'count', contributionWeight: 1 });
    await expect(
      linkHabit(c, new ObjectId(goal.id), habit._id, { contributionType: 'count', contributionWeight: 1 })
    ).rejects.toBeInstanceOf(GoalHabitError);
  });

  it('unlinking a habit that is not linked throws', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G' }));
    const habit = await booleanHabit(c, 'H');
    await expect(unlinkHabit(c, new ObjectId(goal.id), habit._id)).rejects.toBeInstanceOf(GoalHabitError);
  });

  it('recomputes habit-based progress from satisfied days once linked', async () => {
    const c = ctx();
    const goal = await createGoal(
      c,
      createGoalSchema.parse({ title: 'Read 24 books', progressMethod: 'habit', targetValue: 10 })
    );
    const habit = await booleanHabit(c, 'Read every day');
    const today = zonedDayKey(new Date(), 'UTC');
    await habitLogsRepository.upsertForDay({
      workspaceId: c.workspaceId,
      habitId: habit._id,
      userId: c.userId,
      date: today,
      status: 'completed',
    });

    await linkHabit(c, new ObjectId(goal.id), habit._id, { contributionType: 'count', contributionWeight: 1 });

    const detail = await getGoalDetail(c, new ObjectId(goal.id));
    expect(detail.currentValue).toBe(1);
    expect(detail.progressPct).toBe(10);

    const contribution = await computeHabitContribution(c, new ObjectId(goal.id));
    expect(contribution).toBe(1);
  });

  it('updates contribution weight and reflects it in recomputed progress', async () => {
    const c = ctx();
    const goal = await createGoal(
      c,
      createGoalSchema.parse({ title: 'G', progressMethod: 'habit', targetValue: 10 })
    );
    const habit = await booleanHabit(c, 'H');
    const today = zonedDayKey(new Date(), 'UTC');
    await habitLogsRepository.upsertForDay({
      workspaceId: c.workspaceId,
      habitId: habit._id,
      userId: c.userId,
      date: today,
      status: 'completed',
    });
    await linkHabit(c, new ObjectId(goal.id), habit._id, { contributionType: 'count', contributionWeight: 1 });

    await updateHabitContribution(c, new ObjectId(goal.id), habit._id, { contributionWeight: 3 });
    const detail = await getGoalDetail(c, new ObjectId(goal.id));
    expect(detail.currentValue).toBe(3);
  });

  it('mixed method averages milestone/task/habit percentages that have data', async () => {
    const c = ctx();
    const goal = await createGoal(c, createGoalSchema.parse({ title: 'G', progressMethod: 'mixed', targetValue: 2 }));
    const habit = await booleanHabit(c, 'H');
    const today = zonedDayKey(new Date(), 'UTC');
    await habitLogsRepository.upsertForDay({
      workspaceId: c.workspaceId,
      habitId: habit._id,
      userId: c.userId,
      date: today,
      status: 'completed',
    });

    await linkHabit(c, new ObjectId(goal.id), habit._id, { contributionType: 'count', contributionWeight: 1 });

    // Only the habit signal has data (1 of targetValue 2 = 50%); milestone/task have none yet.
    const detail = await getGoalDetail(c, new ObjectId(goal.id));
    expect(detail.progressPct).toBe(50);
  });
});
