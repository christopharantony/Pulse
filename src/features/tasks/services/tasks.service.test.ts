import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  addSubtask,
  archiveTask,
  bulkDeleteTasks,
  bulkUpdateTasks,
  completeTask,
  createTask,
  deleteTask,
  duplicateTask,
  listTasks,
  moveTask,
  permanentlyDeleteTask,
  reorderTask,
  restoreTask,
  TaskError,
  toggleSubtask,
  unarchiveTask,
  updateTask,
} from '@/features/tasks/services/tasks.service';
import { AppError } from '@/lib/app-error';
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

describe('tasks.service — lifecycle', () => {
  it('creates a task defaulting to inbox and completes it', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Ship it' } as never);
    expect(task.status).toBe('inbox');

    const completed = await completeTask(c, task._id);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).not.toBeNull();
  });

  it('rolls a fixed-recurrence task forward on completion instead of marking it completed', async () => {
    const c = ctx();
    const dueDate = new Date('2026-07-13T00:00:00.000Z');
    const task = await createTask(c, {
      title: 'Water plants',
      status: 'todo',
      dueDate,
      recurrence: { frequency: 'daily', interval: 1, completionBehavior: 'fixed' },
    } as never);

    const rolled = await completeTask(c, task._id);
    expect(rolled.status).not.toBe('completed');
    expect(rolled.completedAt).toBeNull();
    expect(rolled.dueDate?.toISOString()).toBe('2026-07-14T00:00:00.000Z');
  });

  it('soft-deletes, restores, and permanently deletes a task', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Temp' } as never);

    await deleteTask(c, task._id);
    await expect(updateTask(c, task._id, { title: 'x' })).rejects.toMatchObject({ status: 404 });

    const restored = await restoreTask(c, task._id);
    expect(restored.deletedAt).toBeNull();

    await expect(permanentlyDeleteTask(c, task._id)).rejects.toBeInstanceOf(TaskError);

    await deleteTask(c, task._id);
    await permanentlyDeleteTask(c, task._id);
  });

  it('duplicates a task with regenerated subtask ids and reset schedule', async () => {
    const c = ctx();
    const task = await createTask(c, {
      title: 'Original',
      status: 'todo',
      dueDate: new Date(),
      subtasks: [{ title: 'Step 1', completed: true, order: 0, children: [] }],
    } as never);

    const copy = await duplicateTask(c, task._id);
    expect(copy.title).toBe('Original (copy)');
    expect(copy.dueDate).toBeNull();
    expect(copy.status).toBe('todo');
    expect(copy.subtasks).toHaveLength(1);
    expect(copy.subtasks[0]._id.equals(task.subtasks[0]._id)).toBe(false);
  });

  it('archives and unarchives a task', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Archive me', status: 'todo' } as never);
    const archived = await archiveTask(c, task._id);
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).not.toBeNull();

    const unarchived = await unarchiveTask(c, task._id, 'todo');
    expect(unarchived.status).toBe('todo');
    expect(unarchived.archivedAt).toBeNull();
  });

  it('rejects operating on a task from a different workspace with a 404', async () => {
    const owner = ctx();
    const task = await createTask(owner, { title: 'Private' } as never);
    const intruder = ctx();
    await expect(updateTask(intruder, task._id, { title: 'hack' })).rejects.toBeInstanceOf(AppError);
    await expect(updateTask(intruder, task._id, { title: 'hack' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('tasks.service — ordering', () => {
  it('moves a task to a new status column with a new order', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Move me', status: 'todo' } as never);
    const moved = await moveTask(c, task._id, 'in_progress', 500);
    expect(moved.status).toBe('in_progress');
    expect(moved.order).toBe(500);
  });

  it('reorders a task within its column', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Reorder me', status: 'todo' } as never);
    const reordered = await reorderTask(c, task._id, 42);
    expect(reordered.order).toBe(42);
  });
});

describe('tasks.service — bulk operations', () => {
  it('bulk-updates only tasks the caller owns', async () => {
    const owner = ctx();
    const a = await createTask(owner, { title: 'A', status: 'todo' } as never);
    const b = await createTask(owner, { title: 'B', status: 'todo' } as never);
    const stranger = ctx();
    const foreign = await createTask(stranger, { title: 'Foreign', status: 'todo' } as never);

    const modified = await bulkUpdateTasks(owner, [a._id.toHexString(), b._id.toHexString(), foreign._id.toHexString()], {
      priority: 'high',
    });
    expect(modified).toBe(2);

    const list = await listTasks(owner, {});
    expect(list.items.every((t) => t.priority === 'high')).toBe(true);
  });

  it('bulk-deletes (soft-deletes) owned tasks only', async () => {
    const owner = ctx();
    const a = await createTask(owner, { title: 'A' } as never);
    const modified = await bulkDeleteTasks(owner, [a._id.toHexString()]);
    expect(modified).toBe(1);
    await expect(updateTask(owner, a._id, { title: 'x' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('tasks.service — subtasks', () => {
  it('adds, toggles, and computes recursive progress for subtasks', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'With subtasks' } as never);

    const withSub = await addSubtask(c, task._id, null, 'Step 1');
    expect(withSub.subtasks).toHaveLength(1);
    const subtaskId = withSub.subtasks[0]._id;

    const withNested = await addSubtask(c, task._id, subtaskId.toHexString(), 'Step 1a');
    expect(withNested.subtasks[0].children).toHaveLength(1);

    const { progress } = await toggleSubtask(c, task._id, subtaskId, true);
    expect(progress).toEqual({ completed: 1, total: 2 });
  });
});

describe('tasks.service — list filtering', () => {
  it('excludes archived tasks by default and includes them when requested', async () => {
    const c = ctx();
    const active = await createTask(c, { title: 'Active', status: 'todo' } as never);
    const archived = await createTask(c, { title: 'Archived', status: 'todo' } as never);
    await archiveTask(c, archived._id);

    const defaultList = await listTasks(c, {});
    expect(defaultList.items.map((t) => t.id)).toContain(active._id.toHexString());
    expect(defaultList.items.map((t) => t.id)).not.toContain(archived._id.toHexString());

    const withArchived = await listTasks(c, { includeArchived: true });
    expect(withArchived.items.map((t) => t.id)).toContain(archived._id.toHexString());
  });
});
