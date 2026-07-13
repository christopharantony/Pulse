import 'server-only';
import type { Db } from 'mongodb';
import { COLLECTIONS } from '@/db/collections';

/** Task, task-comment, and task-activity indexes (architecture doc Section 9). */
export async function ensureTaskIndexes(db: Db): Promise<void> {
  const tasks = db.collection(COLLECTIONS.tasks);
  // The "today / upcoming" view — the single most common query in the app.
  await tasks.createIndex({ workspaceId: 1, status: 1, dueDate: 1 });
  // A project's task list.
  await tasks.createIndex({ workspaceId: 1, projectId: 1 });
  // In-app search (title/description/notes).
  await tasks.createIndex({ title: 'text', description: 'text', notes: 'text' });
  // Trash view / purge job.
  await tasks.createIndex({ workspaceId: 1, deletedAt: 1 });
  // Kanban column read + manual reorder.
  await tasks.createIndex({ workspaceId: 1, status: 1, order: 1 });
  // Filter/search by tag.
  await tasks.createIndex({ workspaceId: 1, tagIds: 1 });
  // Archive view.
  await tasks.createIndex({ workspaceId: 1, archivedAt: 1 });
  // "Recurring" filter.
  await tasks.createIndex({ workspaceId: 1, 'recurrence.frequency': 1 });

  const comments = db.collection(COLLECTIONS.taskComments);
  await comments.createIndex({ taskId: 1, createdAt: -1 });

  const activity = db.collection(COLLECTIONS.taskActivity);
  await activity.createIndex({ taskId: 1, createdAt: -1 });
  await activity.createIndex({ workspaceId: 1, createdAt: -1 });
}
