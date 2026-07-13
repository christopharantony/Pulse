import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { Task } from '@/features/tasks/types/task';
import { projectsRepository } from '@/features/projects/repositories/projects.repository';
import type { Project } from '@/features/projects/types/project';
import type { RecentTaskItem, RecentTasksData } from '@/features/dashboard/types/dashboard';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { clampLimit } from '@/lib/query/pagination';

/**
 * "Recent Tasks": the most-recently-touched tasks, newest first. Recency (`updatedAt`) is a custom
 * sort, so this uses offset pagination (the shared cursor is fixed to `{createdAt,_id}`) — the sub
 * endpoint threads `offset` for "load more". An explicit projection drops the heavy
 * `description`/`checklist` fields the list never renders.
 */
export async function buildRecentTasks(
  ctx: WorkspaceContext,
  opts?: { offset?: number | null; limit?: number | null }
): Promise<RecentTasksData> {
  const limit = clampLimit(opts?.limit);
  const offset = Math.max(0, Math.floor(opts?.offset ?? 0));

  const tasks = await tasksRepository.collection();
  const filter = { workspaceId: ctx.workspaceId, deletedAt: null } as Filter<Task>;

  const [docs, total] = await Promise.all([
    tasks
      .find(filter)
      .project({ description: 0, checklist: 0 })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray() as Promise<Task[]>,
    tasks.countDocuments(filter),
  ]);

  const projectMap = await loadProjects(docs.map((t) => t.projectId));

  const items: RecentTaskItem[] = docs.map((task) =>
    serializeTask(task, task.projectId ? (projectMap.get(task.projectId.toHexString()) ?? null) : null)
  );

  const nextOffset = offset + docs.length < total ? offset + limit : null;
  return { items, nextOffset, total };
}

/** Map a Task document + its (optional) resolved project into the JSON-safe list item. */
export function serializeTask(
  task: Task,
  project: { id: string; name: string; color: string | null } | null
): RecentTaskItem {
  return {
    id: task._id.toHexString(),
    title: task.title,
    status: task.status,
    priority: task.priority,
    project,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    updatedAt: task.updatedAt.toISOString(),
  };
}

/** Batch-load the projects referenced by a page of tasks into a serialized lookup map. */
async function loadProjects(
  projectIds: (ObjectId | null)[]
): Promise<Map<string, { id: string; name: string; color: string | null }>> {
  const ids = [...new Map(projectIds.filter((id): id is ObjectId => id != null).map((id) => [id.toHexString(), id])).values()];
  const map = new Map<string, { id: string; name: string; color: string | null }>();
  if (ids.length === 0) return map;

  const collection = await projectsRepository.collection();
  const projects = (await collection
    .find({ _id: { $in: ids } } as Filter<Project>)
    .toArray()) as Project[];
  for (const project of projects) {
    map.set(project._id.toHexString(), {
      id: project._id.toHexString(),
      name: project.name,
      color: project.color,
    });
  }
  return map;
}
