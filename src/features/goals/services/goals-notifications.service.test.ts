import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { checkGoalDeadlines, checkMilestonesDue, checkInactiveGoals } from '@/features/goals/services/goals-notifications.service';
import { notificationsRepository } from '@/features/notifications/repositories/notifications.repository';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('checkGoalDeadlines', () => {
  it('notifies once for a goal whose targetDate falls within the window, then skips it on a re-run', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, createdBy, {
      title: 'Due soon',
      status: 'active',
      targetDate: new Date(Date.now() + 2 * DAY_MS),
    });

    const first = await checkGoalDeadlines();
    expect(first.notified).toBeGreaterThanOrEqual(1);

    const notifications = await notificationsRepository.listForUser(createdBy);
    expect(notifications.items.some((n) => n.entityId?.equals(goal._id) && n.type === 'goal_deadline')).toBe(true);

    const second = await checkGoalDeadlines();
    const notificationsAfter = await notificationsRepository.listForUser(createdBy);
    // No duplicate for the same goal on a second run.
    expect(notificationsAfter.items.filter((n) => n.entityId?.equals(goal._id)).length).toBe(1);
    void second;
  });

  it('ignores goals whose targetDate is outside the window or already completed', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    await goalsRepository.create(workspaceId, createdBy, {
      title: 'Far away',
      targetDate: new Date(Date.now() + 60 * DAY_MS),
    });
    const completed = await goalsRepository.create(workspaceId, createdBy, {
      title: 'Already done',
      status: 'completed',
      targetDate: new Date(Date.now() + 1 * DAY_MS),
    });

    await checkGoalDeadlines();
    const notifications = await notificationsRepository.listForUser(createdBy);
    expect(notifications.items.some((n) => n.entityId?.equals(completed._id))).toBe(false);
  });
});

describe('checkMilestonesDue', () => {
  it('notifies for a pending milestone due within the window', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, createdBy, { title: 'Ship v1' });
    const milestone = await milestonesRepository.create(workspaceId, goal._id, {
      title: 'Beta',
      order: 0,
      dueDate: new Date(Date.now() + 1 * DAY_MS),
    });

    const result = await checkMilestonesDue();
    expect(result.notified).toBeGreaterThanOrEqual(1);

    const notifications = await notificationsRepository.listForUser(createdBy);
    expect(notifications.items.some((n) => n.entityId?.equals(milestone._id) && n.type === 'milestone_due')).toBe(true);
  });
});

describe('checkInactiveGoals', () => {
  it('notifies for an active goal with no recent activity', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, createdBy, { title: 'Stale', status: 'active' });

    // Simulate staleness directly, since create() always stamps a fresh updatedAt.
    const collection = await goalsRepository.collection();
    await collection.updateOne(
      { _id: goal._id },
      { $set: { updatedAt: new Date(Date.now() - 20 * DAY_MS), createdAt: new Date(Date.now() - 20 * DAY_MS) } }
    );

    const result = await checkInactiveGoals();
    expect(result.notified).toBeGreaterThanOrEqual(1);

    const notifications = await notificationsRepository.listForUser(createdBy);
    expect(notifications.items.some((n) => n.entityId?.equals(goal._id) && n.type === 'goal_inactive')).toBe(true);
  });

  it('does not flag a recently active goal', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    const goal = await goalsRepository.create(workspaceId, createdBy, { title: 'Fresh', status: 'active' });

    await checkInactiveGoals();
    const notifications = await notificationsRepository.listForUser(createdBy);
    expect(notifications.items.some((n) => n.entityId?.equals(goal._id))).toBe(false);
  });
});
