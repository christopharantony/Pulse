import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Task and task-comment indexes (architecture doc Section 9). */
export async function ensureTaskIndexes(db: Db): Promise<void> {
  const tasks = db.collection(COLLECTIONS.tasks);
  // The "today / upcoming" view — the single most common query in the app.
  await tasks.createIndex({ workspaceId: 1, status: 1, dueDate: 1 });
  // A project's task list.
  await tasks.createIndex({ workspaceId: 1, projectId: 1 });
  // In-app search.
  await tasks.createIndex({ title: 'text', description: 'text' });
  // Trash view / purge job.
  await tasks.createIndex({ workspaceId: 1, deletedAt: 1 });

  const comments = db.collection(COLLECTIONS.taskComments);
  await comments.createIndex({ taskId: 1, createdAt: -1 });
}
