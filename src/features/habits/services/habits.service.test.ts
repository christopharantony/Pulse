import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import { completeHabitToday } from '@/features/habits/services/habits.service';
import { createTask } from '@/features/tasks/services/tasks.service';
import { buildRecentTasks } from '@/features/dashboard/services/recent-tasks.aggregator';
import { AppError } from '@/lib/app-error';
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

describe('completeHabitToday', () => {
  it('logs today’s completion and returns the recomputed streak', async () => {
    const c = ctx();
    const habit = await habitsRepository.create(c.workspaceId, c.userId, {
      name: 'Read',
      recurrence: { frequency: 'daily', interval: 1 },
    });

    const result = await completeHabitToday(c, habit._id);
    expect(result.completedToday).toBe(true);
    expect(result.currentStreak).toBe(1);

    const logs = await habitLogsRepository.listCompleted(habit._id);
    expect(logs).toHaveLength(1);
    expect(logs[0].date.getTime()).toBe(zonedDayKey(new Date(), 'UTC').getTime());
  });

  it('is idempotent within a day — completing twice keeps one log', async () => {
    const c = ctx();
    const habit = await habitsRepository.create(c.workspaceId, c.userId, {
      name: 'Stretch',
      recurrence: { frequency: 'daily', interval: 1 },
    });

    await completeHabitToday(c, habit._id);
    await completeHabitToday(c, habit._id);

    const logs = await habitLogsRepository.listCompleted(habit._id);
    expect(logs).toHaveLength(1);
  });

  it('rejects completing a habit in another workspace with a 404', async () => {
    const owner = ctx();
    const habit = await habitsRepository.create(owner.workspaceId, owner.userId, {
      name: 'Private',
      recurrence: { frequency: 'daily', interval: 1 },
    });

    const intruder = ctx(); // different workspaceId
    await expect(completeHabitToday(intruder, habit._id)).rejects.toBeInstanceOf(AppError);
    await expect(completeHabitToday(intruder, habit._id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createTask (quick create)', () => {
  it('creates a task that surfaces in recent tasks', async () => {
    const c = ctx();
    const task = await createTask(c, {
      title: 'Quick task',
      status: 'todo',
      priority: 'high',
    } as never);

    expect(task.title).toBe('Quick task');
    expect(task.workspaceId.equals(c.workspaceId)).toBe(true);

    const recent = await buildRecentTasks(c);
    expect(recent.items.some((t) => t.id === task._id.toHexString())).toBe(true);
    expect(recent.items[0]).toMatchObject({ title: 'Quick task', priority: 'high' });
  });

  it('maps a string projectId into an ObjectId reference', async () => {
    const c = ctx();
    const projectId = new ObjectId();
    const task = await createTask(c, {
      title: 'With project',
      projectId: projectId.toHexString(),
      status: 'todo',
      priority: 'none',
    } as never);

    expect(task.projectId).not.toBeNull();
    expect(task.projectId?.equals(projectId)).toBe(true);
  });
});
