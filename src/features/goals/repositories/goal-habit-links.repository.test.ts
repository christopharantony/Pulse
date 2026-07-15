import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { goalHabitLinksRepository } from '@/features/goals/repositories/goal-habit-links.repository';

describe('goalHabitLinksRepository', () => {
  it('creates a link and finds it by goal+habit', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    const habitId = new ObjectId();

    await goalHabitLinksRepository.create(workspaceId, goalId, habitId, {
      contributionType: 'count',
      contributionWeight: 1,
    });

    const found = await goalHabitLinksRepository.findByGoalAndHabit(goalId, habitId);
    expect(found?.contributionType).toBe('count');
  });

  it('lists links by goal and by habit', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    const habitA = new ObjectId();
    const habitB = new ObjectId();

    await goalHabitLinksRepository.create(workspaceId, goalId, habitA, { contributionType: 'count', contributionWeight: 1 });
    await goalHabitLinksRepository.create(workspaceId, goalId, habitB, { contributionType: 'value', contributionWeight: 2 });

    const byGoal = await goalHabitLinksRepository.listByGoal(goalId);
    expect(byGoal).toHaveLength(2);

    const byHabit = await goalHabitLinksRepository.listByHabit(habitA);
    expect(byHabit).toHaveLength(1);
  });

  it('updates contribution and removes a link', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    const habitId = new ObjectId();
    const link = await goalHabitLinksRepository.create(workspaceId, goalId, habitId, {
      contributionType: 'count',
      contributionWeight: 1,
    });

    const updated = await goalHabitLinksRepository.updateContribution(link._id, { contributionWeight: 5 });
    expect(updated?.contributionWeight).toBe(5);

    await goalHabitLinksRepository.remove(link._id);
    expect(await goalHabitLinksRepository.findByGoalAndHabit(goalId, habitId)).toBeNull();
  });

  it('deleteAllForGoal and deleteAllForHabit cascade cleanly', async () => {
    const workspaceId = new ObjectId();
    const goalId = new ObjectId();
    const habitId = new ObjectId();
    await goalHabitLinksRepository.create(workspaceId, goalId, habitId, { contributionType: 'count', contributionWeight: 1 });

    await goalHabitLinksRepository.deleteAllForGoal(goalId);
    expect(await goalHabitLinksRepository.listByGoal(goalId)).toHaveLength(0);
  });
});
