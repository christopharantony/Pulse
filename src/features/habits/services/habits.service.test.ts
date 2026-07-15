import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import {
  archiveHabit,
  completeHabitToday,
  createHabit,
  deleteHabit,
  getHabitDetail,
  HabitError,
  logHabitDay,
  permanentlyDeleteHabit,
  restoreHabit,
  unarchiveHabit,
  undoHabitLog,
  updateHabit,
} from '@/features/habits/services/habits.service';
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
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    });

    const result = await completeHabitToday(c, habit._id);
    expect(result.today.state).toBe('completed');
    expect(result.currentStreak).toBe(1);

    const log = await habitLogsRepository.findForDay(habit._id, zonedDayKey(new Date(), 'UTC'));
    expect(log?.status).toBe('completed');
    expect(log?.date.getTime()).toBe(zonedDayKey(new Date(), 'UTC').getTime());
  });

  it('is idempotent within a day — completing twice keeps one log and one streak increment', async () => {
    const c = ctx();
    const habit = await habitsRepository.create(c.workspaceId, c.userId, {
      name: 'Stretch',
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    });

    await completeHabitToday(c, habit._id);
    const second = await completeHabitToday(c, habit._id);

    expect(second.currentStreak).toBe(1);
    const range = await habitLogsRepository.listForRange(habit._id, zonedDayKey(new Date(), 'UTC'), zonedDayKey(new Date(), 'UTC'));
    expect(range).toHaveLength(1);
  });

  it('rejects completing a habit in another workspace with a 404', async () => {
    const owner = ctx();
    const habit = await habitsRepository.create(owner.workspaceId, owner.userId, {
      name: 'Private',
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    });

    const intruder = ctx(); // different workspaceId
    await expect(completeHabitToday(intruder, habit._id)).rejects.toBeInstanceOf(AppError);
    await expect(completeHabitToday(intruder, habit._id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('habits.service CRUD + trash invariants', () => {
  it('creates and reads back a habit detail', async () => {
    const c = ctx();
    const created = await createHabit(c, {
      name: 'Walk',
      type: 'numeric',
      recurrence: { frequency: 'daily', interval: 1 },
      targetValue: 10000,
      unit: 'steps',
    } as never);
    const detail = await getHabitDetail(c, new ObjectId(created.id));
    expect(detail.name).toBe('Walk');
    expect(detail.type).toBe('numeric');
    expect(detail.targetValue).toBe(10000);
  });

  it('type is never patchable via updateHabit', async () => {
    const c = ctx();
    const created = await createHabit(c, {
      name: 'Meditate',
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1 },
    } as never);
    // Even if a client smuggled `type` into the payload, updateHabit's patch builder never reads it.
    const updated = await updateHabit(c, new ObjectId(created.id), { name: 'Meditate daily', type: 'numeric' } as never);
    expect(updated.type).toBe('boolean');
    expect(updated.name).toBe('Meditate daily');
  });

  it('delete → restore → permanent-delete-only-from-trash invariant', async () => {
    const c = ctx();
    const created = await createHabit(c, {
      name: 'Temp habit',
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1 },
    } as never);
    const id = new ObjectId(created.id);

    // Permanent delete before trashing must be rejected.
    await expect(permanentlyDeleteHabit(c, id)).rejects.toMatchObject({ code: 'HABIT_NOT_IN_TRASH' });

    await deleteHabit(c, id);
    await expect(getHabitDetail(c, id)).resolves.toBeDefined(); // includeDeleted reads still find it

    const restored = await restoreHabit(c, id);
    expect(restored.id).toBe(created.id);

    await deleteHabit(c, id);
    await permanentlyDeleteHabit(c, id);
    await expect(getHabitDetail(c, id)).rejects.toBeInstanceOf(HabitError);
  });

  it('archive/unarchive round-trips', async () => {
    const c = ctx();
    const created = await createHabit(c, {
      name: 'Archive me',
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1 },
    } as never);
    const id = new ObjectId(created.id);
    const archived = await archiveHabit(c, id);
    expect(archived.archivedAt).not.toBeNull();
    const unarchived = await unarchiveHabit(c, id);
    expect(unarchived.archivedAt).toBeNull();
  });
});

describe('logHabitDay by type', () => {
  it('numeric habit: increments value and marks completed at target', async () => {
    const c = ctx();
    const created = await createHabit(c, {
      name: 'Water',
      type: 'numeric',
      recurrence: { frequency: 'daily', interval: 1 },
      targetValue: 2,
      unit: 'glasses',
    } as never);
    const id = new ObjectId(created.id);

    const first = await logHabitDay(c, id, { deltaValue: 1 } as never);
    expect(first.today.valueToday).toBe(1);
    expect(first.today.state).not.toBe('completed');

    const second = await logHabitDay(c, id, { deltaValue: 1 } as never);
    expect(second.today.valueToday).toBe(2);
    expect(second.today.state).toBe('completed');
    expect(second.currentStreak).toBe(1);
  });

  it('checklist habit: completes once every item is checked', async () => {
    const c = ctx();
    const created = await createHabit(c, {
      name: 'Morning routine',
      type: 'checklist',
      recurrence: { frequency: 'daily', interval: 1 },
      checklistItems: [
        { id: 'a', name: 'Brush teeth', order: 0 },
        { id: 'b', name: 'Stretch', order: 1 },
      ],
    } as never);
    const id = new ObjectId(created.id);

    const partial = await logHabitDay(c, id, { checkedItemIds: ['a'] } as never);
    expect(partial.today.state).toBe('partial');

    const done = await logHabitDay(c, id, { checkedItemIds: ['a', 'b'] } as never);
    expect(done.today.state).toBe('completed');
  });

  it('undoHabitLog clears today and resets the streak', async () => {
    const c = ctx();
    const created = await createHabit(c, {
      name: 'Undo me',
      type: 'boolean',
      recurrence: { frequency: 'daily', interval: 1 },
    } as never);
    const id = new ObjectId(created.id);
    await logHabitDay(c, id, { status: 'completed' } as never);

    const undone = await undoHabitLog(c, id);
    expect(undone.today.state).toBe('pending'); // scheduled today, no log after undo
    expect(undone.currentStreak).toBe(0);
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
