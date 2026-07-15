import 'server-only';
import type { Filter } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';
import { goalActivityRepository } from '@/features/goals/repositories/goal-activity.repository';
import { notificationsRepository } from '@/features/notifications/repositories/notifications.repository';
import type { Notification, NotificationType } from '@/features/notifications/types/notification';
import type { Goal } from '@/features/goals/types/goal';
import type { Milestone } from '@/features/goals/types/milestone';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEADLINE_WINDOW_DAYS = 3;
const MILESTONE_DUE_WINDOW_DAYS = 3;
const INACTIVITY_THRESHOLD_DAYS = 14;

/**
 * True when a notification of this type already exists for the entity. This job runs nightly and
 * an entity can sit inside its "approaching" window for several days, so without this guard the
 * same deadline would re-notify every night it's checked. Trade-off: a goal only ever gets one
 * notification per type for its whole lifetime (there's no "re-arm" once the underlying condition
 * changes, e.g. the deadline passes and a new one is set) — acceptable for an MVP alerting pass.
 */
async function alreadyNotified(workspaceId: Goal['workspaceId'], entityId: Goal['_id'], type: NotificationType): Promise<boolean> {
  const count = await notificationsRepository.count({ workspaceId, entityId, type } as Filter<Notification>);
  return count > 0;
}

/** Goals with an approaching, not-yet-notified `targetDate`. Uses the existing `NotificationType.goal_deadline`. */
export async function checkGoalDeadlines(): Promise<{ notified: number }> {
  const collection = await goalsRepository.collection();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + DEADLINE_WINDOW_DAYS * MS_PER_DAY);
  const goals = (await collection
    .find({
      deletedAt: null,
      status: { $nin: ['completed', 'cancelled', 'archived'] },
      targetDate: { $gte: now, $lte: windowEnd },
    } as Filter<Goal>)
    .toArray()) as Goal[];

  let notified = 0;
  for (const goal of goals) {
    if (await alreadyNotified(goal.workspaceId, goal._id, 'goal_deadline')) continue;
    await notificationsRepository.create({
      workspaceId: goal.workspaceId,
      userId: goal.createdBy,
      type: 'goal_deadline',
      title: `"${goal.title}" is due soon`,
      body: `Target date: ${goal.targetDate!.toDateString()}`,
      entityType: 'goal',
      entityId: goal._id,
    });
    notified += 1;
  }
  return { notified };
}

/** Pending milestones with an approaching, not-yet-notified due date. */
export async function checkMilestonesDue(): Promise<{ notified: number }> {
  const collection = await milestonesRepository.collection();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + MILESTONE_DUE_WINDOW_DAYS * MS_PER_DAY);
  const milestones = (await collection
    .find({ deletedAt: null, status: 'pending', dueDate: { $gte: now, $lte: windowEnd } } as Filter<Milestone>)
    .toArray()) as Milestone[];

  let notified = 0;
  for (const milestone of milestones) {
    if (await alreadyNotified(milestone.workspaceId, milestone._id, 'milestone_due')) continue;
    const goal = await goalsRepository.findById(milestone.goalId);
    if (!goal) continue;
    await notificationsRepository.create({
      workspaceId: milestone.workspaceId,
      userId: goal.createdBy,
      type: 'milestone_due',
      title: `Milestone "${milestone.title}" is due soon`,
      body: `Part of goal "${goal.title}"`,
      entityType: 'milestone',
      entityId: milestone._id,
    });
    notified += 1;
  }
  return { notified };
}

/**
 * Active goals with no recorded activity in `INACTIVITY_THRESHOLD_DAYS`. `Goal.updatedAt` is used
 * as a cheap first filter (most mutations touch it via progress recompute), then the actual
 * `goal_activity` log is checked for the real last-event time, since a manual-method goal's
 * `updatedAt` can lag behind activity that never changed its progress.
 */
export async function checkInactiveGoals(): Promise<{ notified: number }> {
  const collection = await goalsRepository.collection();
  const now = new Date();
  const threshold = new Date(now.getTime() - INACTIVITY_THRESHOLD_DAYS * MS_PER_DAY);
  const goals = (await collection
    .find({ deletedAt: null, status: 'active', updatedAt: { $lt: threshold } } as Filter<Goal>)
    .toArray()) as Goal[];

  let notified = 0;
  for (const goal of goals) {
    if (await alreadyNotified(goal.workspaceId, goal._id, 'goal_inactive')) continue;
    const [recent] = await goalActivityRepository.listByGoal(goal._id, { limit: 1 });
    const lastActivityAt = recent?.createdAt ?? goal.createdAt;
    if (lastActivityAt.getTime() >= threshold.getTime()) continue;

    await notificationsRepository.create({
      workspaceId: goal.workspaceId,
      userId: goal.createdBy,
      type: 'goal_inactive',
      title: `No progress on "${goal.title}" recently`,
      body: 'This goal could use some attention.',
      entityType: 'goal',
      entityId: goal._id,
    });
    notified += 1;
  }
  return { notified };
}

export async function runGoalNotificationChecks(): Promise<{ deadlines: number; milestonesDue: number; inactive: number }> {
  const [deadlines, milestonesDue, inactive] = await Promise.all([
    checkGoalDeadlines(),
    checkMilestonesDue(),
    checkInactiveGoals(),
  ]);
  return { deadlines: deadlines.notified, milestonesDue: milestonesDue.notified, inactive: inactive.notified };
}
