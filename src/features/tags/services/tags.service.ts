import 'server-only';
import type { Filter, ObjectId, UpdateFilter } from 'mongodb';
import { tagsRepository } from '@/features/tags/repositories/tags.repository';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { Tag } from '@/features/tags/types/tag';
import type { Task } from '@/features/tasks/types/task';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';

export class TagError extends AppError {
  constructor(message: string, code: 'TAG_NOT_FOUND' | 'TAG_NAME_TAKEN', status: number) {
    super(message, code, status);
  }
}

async function getOwnedTag(ctx: WorkspaceContext, id: ObjectId): Promise<Tag> {
  const tag = await tagsRepository.findById(id);
  if (!tag || !tag.workspaceId.equals(ctx.workspaceId)) {
    throw new TagError('Tag not found', 'TAG_NOT_FOUND', 404);
  }
  return tag;
}

export async function listTags(ctx: WorkspaceContext): Promise<Tag[]> {
  const result = await tagsRepository.listByWorkspace(ctx.workspaceId, { limit: 200 });
  return result.items;
}

/**
 * Enforce `{workspaceId, name}` uniqueness at the service layer — MongoDB can't cheaply enforce
 * this without a dedicated unique index, which is a fine future promotion once tag creation is a
 * hot path; a pre-check is sufficient at this scale.
 */
export async function createTag(
  ctx: WorkspaceContext,
  input: { name: string; color?: string | null }
): Promise<Tag> {
  const existing = await tagsRepository.findByName(ctx.workspaceId, input.name);
  if (existing) throw new TagError('A tag with this name already exists', 'TAG_NAME_TAKEN', 409);
  return tagsRepository.create(ctx.workspaceId, input);
}

/** Find a tag by name, or create it — used by quick-add's inline "type a new tag" UX. */
export async function findOrCreateByName(ctx: WorkspaceContext, name: string): Promise<Tag> {
  const existing = await tagsRepository.findByName(ctx.workspaceId, name);
  if (existing) return existing;
  return tagsRepository.create(ctx.workspaceId, { name });
}

export async function renameTag(
  ctx: WorkspaceContext,
  id: ObjectId,
  patch: { name?: string; color?: string | null }
): Promise<Tag> {
  await getOwnedTag(ctx, id);
  if (patch.name) {
    const existing = await tagsRepository.findByName(ctx.workspaceId, patch.name);
    if (existing && !existing._id.equals(id)) {
      throw new TagError('A tag with this name already exists', 'TAG_NAME_TAKEN', 409);
    }
  }
  const updated = await tagsRepository.rename(id, patch);
  if (!updated) throw new TagError('Tag not found', 'TAG_NOT_FOUND', 404);
  return updated;
}

/** Delete a tag and pull its id off every task that references it — the one place tag deletion
 * crosses into the tasks collection, so it lives here rather than in either single-collection
 * repository. */
export async function deleteTag(ctx: WorkspaceContext, id: ObjectId): Promise<void> {
  await getOwnedTag(ctx, id);
  await tagsRepository.remove(id);
  const collection = await tasksRepository.collection();
  await collection.updateMany(
    { workspaceId: ctx.workspaceId, tagIds: id } as Filter<Task>,
    { $pull: { tagIds: id } } as UpdateFilter<Task>
  );
}
