import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import { taskCommentsRepository } from '@/features/tasks/repositories/task-comments.repository';

function ctx() {
  return { workspaceId: new ObjectId(), userId: new ObjectId() };
}

describe('tasksRepository', () => {
  it('creates a task with sensible defaults and no timer fields', async () => {
    const { workspaceId, userId } = ctx();
    const task = await tasksRepository.create(workspaceId, userId, { title: 'Write spec' });
    expect(task.status).toBe('inbox');
    expect(task.priority).toBe('none');
    expect(task.tagIds).toEqual([]);
    expect(task.subtasks).toEqual([]);
    expect(task.completedAt).toBeNull();
    expect(task.projectId).toBeNull();
    // Sanity: the Task shape carries no timer/session field.
    expect('activityId' in task).toBe(false);
  });

  it('maintains the completedAt invariant via updateStatus', async () => {
    const { workspaceId, userId } = ctx();
    const task = await tasksRepository.create(workspaceId, userId, { title: 'Do it' });
    const done = await tasksRepository.updateStatus(task._id, 'completed');
    expect(done?.completedAt).toBeInstanceOf(Date);
    const reopened = await tasksRepository.updateStatus(task._id, 'todo');
    expect(reopened?.completedAt).toBeNull();
  });

  it('lists tasks by project and by status, scoped to the workspace', async () => {
    const { workspaceId, userId } = ctx();
    const projectId = new ObjectId();
    await tasksRepository.create(workspaceId, userId, { title: 'A', projectId });
    await tasksRepository.create(workspaceId, userId, { title: 'B', status: 'completed' });
    await tasksRepository.create(new ObjectId(), userId, { title: 'Other workspace' });

    const byProject = await tasksRepository.listByProject(workspaceId, projectId);
    expect(byProject.items).toHaveLength(1);
    expect(byProject.items[0].title).toBe('A');

    const done = await tasksRepository.listByStatus(workspaceId, 'completed');
    expect(done.items.map((t) => t.title)).toEqual(['B']);

    const all = await tasksRepository.listByWorkspace(workspaceId);
    expect(all.items).toHaveLength(2);
  });

  it('searches tasks by text within a workspace', async () => {
    const { workspaceId, userId } = ctx();
    await tasksRepository.create(workspaceId, userId, {
      title: 'Prepare quarterly report',
      description: 'finance numbers',
    });
    await tasksRepository.create(workspaceId, userId, { title: 'Walk the dog' });

    const results = await tasksRepository.search(workspaceId, 'quarterly');
    expect(results.items).toHaveLength(1);
    expect(results.items[0].title).toContain('quarterly');
  });

  it('soft-deletes to trash and restores', async () => {
    const { workspaceId, userId } = ctx();
    const task = await tasksRepository.create(workspaceId, userId, { title: 'Trash me' });
    await tasksRepository.softDeleteById(task._id);

    expect(await tasksRepository.findById(task._id)).toBeNull();
    const trash = await tasksRepository.listTrash(workspaceId);
    expect(trash.map((t) => t._id.toHexString())).toContain(task._id.toHexString());

    const restored = await tasksRepository.restore(task._id);
    expect(restored?.deletedAt).toBeNull();
    expect(await tasksRepository.findById(task._id)).not.toBeNull();
  });

  it('increments actualMinutes atomically from its unset (null) default', async () => {
    const { workspaceId, userId } = ctx();
    const task = await tasksRepository.create(workspaceId, userId, { title: 'Timed task' });
    expect(task.actualMinutes).toBeNull();

    const once = await tasksRepository.incrementActualMinutes(task._id, 15);
    expect(once?.actualMinutes).toBe(15);

    const twice = await tasksRepository.incrementActualMinutes(task._id, 10);
    expect(twice?.actualMinutes).toBe(25);
  });
});

describe('taskCommentsRepository', () => {
  it('adds and lists comments for a task (newest first)', async () => {
    const { workspaceId } = ctx();
    const taskId = new ObjectId();
    const authorId = new ObjectId();

    for (let i = 0; i < 3; i++) {
      const comment = await taskCommentsRepository.create({
        workspaceId,
        taskId,
        authorId,
        body: `comment ${i}`,
      });
      await (await taskCommentsRepository.collection()).updateOne(
        { _id: comment._id },
        { $set: { createdAt: new Date(Date.now() + i * 1000) } }
      );
    }

    const page = await taskCommentsRepository.listByTask(workspaceId, taskId, { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.items[0].body).toBe('comment 2');
    expect(page.hasMore).toBe(true);
  });
});
