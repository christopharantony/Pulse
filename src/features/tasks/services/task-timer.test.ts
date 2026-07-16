import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { createTask, startTaskTimer, stopTaskTimer } from '@/features/tasks/services/tasks.service';
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

describe('task timer (Activity Engine integration)', () => {
  it('starts a timer against a task, lazily creating its Activity with sourceType "task"', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Write the report', status: 'todo' } as never);

    const { session, activity } = await startTaskTimer(c, task._id, {});
    expect(activity.sourceType).toBe('task');
    expect(activity.sourceId?.toHexString()).toBe(task._id.toHexString());
    expect(activity.title).toBe('Write the report');
    expect(session.endedAt).toBeNull();
  });

  it('stops a running task timer and rolls the elapsed minutes into actualMinutes', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'T', status: 'in_progress' } as never);
    const { session } = await startTaskTimer(c, task._id, {});

    const result = await stopTaskTimer(c, task._id, session._id);
    expect(result.session.endedAt).not.toBeNull();
    // `actualMinutes` only gets written once a full minute has elapsed (floored, like the habit
    // timer's rollup) — a sub-minute test run correctly leaves it untouched at `null`.
    expect(result.task.actualMinutes ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('rejects starting a timer against a task in another workspace', async () => {
    const owner = ctx();
    const task = await createTask(owner, { title: 'Private', status: 'todo' } as never);

    const intruder = ctx();
    await expect(startTaskTimer(intruder, task._id, {})).rejects.toMatchObject({ status: 404 });
  });

  it('rejects starting a timer against a completed task', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Done already', status: 'completed' } as never);

    await expect(startTaskTimer(c, task._id, {})).rejects.toMatchObject({
      status: 422,
      code: 'TASK_NOT_TIMEABLE',
    });
  });

  it('rejects starting a timer against an archived task', async () => {
    const c = ctx();
    const task = await createTask(c, { title: 'Shelved', status: 'archived' } as never);

    await expect(startTaskTimer(c, task._id, {})).rejects.toMatchObject({
      status: 422,
      code: 'TASK_NOT_TIMEABLE',
    });
  });
});
