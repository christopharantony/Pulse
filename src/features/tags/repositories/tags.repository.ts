import 'server-only';
import type { ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Tag } from '@/features/tags/types/tag';

const base = createRepository<Tag>({ collectionName: COLLECTIONS.tags });

async function create(
  workspaceId: ObjectId,
  input: { name: string; color?: string | null }
): Promise<Tag> {
  return base.insertOne({ workspaceId, name: input.name, color: input.color ?? null });
}

async function listByWorkspace(
  workspaceId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<Tag>> {
  return base.findMany(withWorkspaceScope({}, workspaceId), opts);
}

/** Look up a tag by its (case-sensitive) name within a workspace; null if absent. */
async function findByName(workspaceId: ObjectId, name: string): Promise<Tag | null> {
  return base.findOne(withWorkspaceScope({ name }, workspaceId));
}

/** Rename/recolor a tag — thin alias over `updateById`, named for call-site intent. */
async function rename(id: ObjectId, patch: { name?: string; color?: string | null }): Promise<Tag | null> {
  return base.updateById(id, patch);
}

/** Soft-delete a tag; caller (tags service) is responsible for pulling the id off tasks.tagIds. */
async function remove(id: ObjectId): Promise<boolean> {
  return base.softDeleteById(id);
}

async function listByIds(workspaceId: ObjectId, ids: ObjectId[]): Promise<Tag[]> {
  if (ids.length === 0) return [];
  const collection = await base.collection();
  return collection
    .find({ workspaceId, _id: { $in: ids }, deletedAt: null })
    .toArray() as Promise<Tag[]>;
}

export const tagsRepository = {
  ...base,
  create,
  listByWorkspace,
  findByName,
  rename,
  remove,
  listByIds,
};
