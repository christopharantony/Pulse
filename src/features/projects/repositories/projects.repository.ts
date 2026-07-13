import 'server-only';
import type { ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Project } from '@/features/projects/types/project';

const base = createRepository<Project>({ collectionName: COLLECTIONS.projects });

async function create(
  workspaceId: ObjectId,
  createdBy: ObjectId,
  input: { name: string; description?: string | null; color?: string | null }
): Promise<Project> {
  return base.insertOne({
    workspaceId,
    createdBy,
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? null,
    isArchived: false,
  });
}

async function listByWorkspace(
  workspaceId: ObjectId,
  opts?: FindManyOptions & { includeArchived?: boolean }
): Promise<PaginatedResult<Project>> {
  const filter = opts?.includeArchived ? {} : { isArchived: false };
  return base.findMany(withWorkspaceScope(filter, workspaceId), opts);
}

async function setArchived(id: ObjectId, isArchived: boolean): Promise<Project | null> {
  return base.updateById(id, { isArchived });
}

export const projectsRepository = {
  ...base,
  create,
  listByWorkspace,
  setArchived,
};
