import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { getUsersCollection } from '@/db/client';
import { getOverview } from '@/features/dashboard/services/dashboard.service';
import { buildRecentTasks } from '@/features/dashboard/services/recent-tasks.aggregator';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import type { User } from '@/types/user';
import { zonedDayKey } from '@/lib/time/day';

const DAY = 24 * 60 * 60 * 1000;

async function seedUser(name: string): Promise<ObjectId> {
  const id = new ObjectId();
  const now = new Date();
  const user: User = {
    _id: id,
    name,
    email: `${id.toHexString()}@example.com`,
    passwordHash: 'x',
    avatar: null,
    emailVerified: true,
    provider: 'credentials',
    providerId: null,
    createdAt: now,
    updatedAt: now,
  };
  await (await getUsersCollection()).insertOne(user);
  return id;
}

/** A fresh workspace context in UTC, so "today" is the current UTC calendar day. */
function contextFor(userId: ObjectId): WorkspaceContext {
  return {
    userId,
    sessionId: 'test-session',
    workspaceId: new ObjectId(),
    timezone: 'UTC',
    weekStartsOn: 1,
  };
}

describe('dashboard.service.getOverview', () => {
  it('assembles every section from seeded data', async () => {
    const userId = await seedUser('Ada');
    const ctx = contextFor(userId);
    const now = new Date();

    // Tasks: one due today (todo), one completed today, one overdue.
    await tasksRepository.create(ctx.workspaceId, userId, { title: 'Due today', dueDate: now });
    const toComplete = await tasksRepository.create(ctx.workspaceId, userId, { title: 'Finish me' });
    await tasksRepository.updateStatus(toComplete._id, 'done');
    await tasksRepository.create(ctx.workspaceId, userId, {
      title: 'Overdue',
      dueDate: new Date(now.getTime() - 2 * DAY),
    });

    // A daily habit, completed today.
    const habit = await habitsRepository.create(ctx.workspaceId, userId, {
      name: 'Meditate',
      recurrence: { frequency: 'daily', interval: 1 },
    });
    await habitLogsRepository.upsertForDay({
      workspaceId: ctx.workspaceId,
      habitId: habit._id,
      userId,
      date: zonedDayKey(now, 'UTC'),
      status: 'completed',
    });
    await habitsRepository.recomputeStreakCache(habit._id);

    // A 30-minute focus session today.
    const session = await timeSessionRepository.startSession({
      workspaceId: ctx.workspaceId,
      userId,
      activityId: new ObjectId(),
      startedAt: new Date(now.getTime() - 30 * 60 * 1000),
    });
    await timeSessionRepository.stopSession(session._id, now);

    const overview = await getOverview(ctx);

    // Greeting
    expect(overview.greeting.name).toBe('Ada');
    expect(overview.greeting.timezone).toBe('UTC');
    expect(overview.greeting.weather).toBeNull();

    // Statistics
    const stat = (key: string) => overview.statistics.cards.find((c) => c.key === key)?.value;
    expect(stat('todaysTasks')).toBe(1);
    expect(stat('completedToday')).toBe(1);
    expect(stat('overdueTasks')).toBe(1);
    expect(stat('habitsCompleted')).toBe('1/1');
    expect(String(stat('focusTimeToday'))).toMatch(/m|h/);

    // Habits
    expect(overview.habits.totalCount).toBe(1);
    expect(overview.habits.completedCount).toBe(1);
    expect(overview.habits.items[0]).toMatchObject({ name: 'Meditate', completedToday: true });

    // Recent tasks
    expect(overview.recentTasks.total).toBe(3);
    expect(overview.recentTasks.items).toHaveLength(3);

    // Productivity
    expect(overview.productivity.score).toBeGreaterThan(0);
    expect(overview.productivity.trend).toHaveLength(7);
    expect(['low', 'building', 'strong', 'peak']).toContain(overview.productivity.band);

    // Calendar (6-week grid)
    expect(overview.calendar.days).toHaveLength(42);
    expect(overview.calendar.days.some((d) => d.isToday)).toBe(true);
  });

  it('scopes data to the workspace — another workspace sees nothing', async () => {
    const userId = await seedUser('Grace');
    const ctx = contextFor(userId);
    await tasksRepository.create(ctx.workspaceId, userId, { title: 'Only mine' });

    const otherCtx = contextFor(userId); // different (random) workspaceId
    const recent = await buildRecentTasks(otherCtx);
    expect(recent.total).toBe(0);
  });

  it('paginates recent tasks by offset', async () => {
    const userId = await seedUser('Linus');
    const ctx = contextFor(userId);
    for (let i = 0; i < 7; i++) {
      await tasksRepository.create(ctx.workspaceId, userId, { title: `Task ${i}` });
    }

    const page1 = await buildRecentTasks(ctx, { offset: 0, limit: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page1.total).toBe(7);
    expect(page1.nextOffset).toBe(5);

    const page2 = await buildRecentTasks(ctx, { offset: 5, limit: 5 });
    expect(page2.items).toHaveLength(2);
    expect(page2.nextOffset).toBeNull();
  });
});
