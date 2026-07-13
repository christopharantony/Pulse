import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import { buildTextSearch } from '@/lib/query/search';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Note } from '@/features/notes/types/note';

const base = createRepository<Note>({ collectionName: COLLECTIONS.notes });

async function create(
  workspaceId: ObjectId,
  createdBy: ObjectId,
  input: {
    title: string;
    body?: string;
    plainText?: string;
    projectId?: ObjectId | null;
    taskId?: ObjectId | null;
    goalId?: ObjectId | null;
    tagIds?: ObjectId[];
  }
): Promise<Note> {
  const body = input.body ?? '';
  return base.insertOne({
    workspaceId,
    createdBy,
    title: input.title,
    body,
    // Fall back to the raw body when no extracted plain text is supplied.
    plainText: input.plainText ?? body,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    goalId: input.goalId ?? null,
    tagIds: input.tagIds ?? [],
  });
}

async function listByWorkspace(
  workspaceId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<Note>> {
  return base.findMany(withWorkspaceScope({}, workspaceId), opts);
}

async function listByProject(
  workspaceId: ObjectId,
  projectId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<Note>> {
  return base.findMany(withWorkspaceScope({ projectId }, workspaceId), opts);
}

/** Full-text search over title/plainText within a workspace (requires the `$text` index). */
async function search(
  workspaceId: ObjectId,
  term: string,
  opts?: FindManyOptions
): Promise<PaginatedResult<Note>> {
  const filter = { ...withWorkspaceScope({}, workspaceId), ...buildTextSearch<Note>(term) };
  return base.findMany(filter as Filter<Note>, opts);
}

export const notesRepository = {
  ...base,
  create,
  listByWorkspace,
  listByProject,
  search,
};
