import 'server-only';
import { ObjectId } from 'mongodb';
import { getUsersCollection } from '@/db/client';
import { DuplicateKeyError } from '@/db/errors';
import { workspaceRepository } from '@/features/workspace/repositories/workspace.repository';
import { DEFAULT_WORKSPACE_SETTINGS, type Workspace } from '@/features/workspace/types/workspace';
import { AppError } from '@/lib/app-error';

/**
 * Workspace tenancy service.
 *
 * Every domain document is workspace-scoped, but registration historically created no workspace and
 * `requireAuth()` yields only a userId. This service closes that gap: it auto-provisions a personal
 * workspace at registration and resolves the caller's "active" workspace on every request, lazily
 * provisioning for any user who predates auto-provisioning. It is deliberately personal-only —
 * multi-workspace switching is a future feature that reuses the same `workspace_members` model.
 */

export class WorkspaceError extends AppError {
  constructor(message: string, code: 'USER_NOT_FOUND' | 'PROVISION_FAILED') {
    super(message, code, code === 'USER_NOT_FOUND' ? 404 : 500);
  }
}

/** Bounded retry for the (astronomically unlikely) slug collision on the unique index. */
const MAX_SLUG_ATTEMPTS = 5;

/** Turn a display name into a URL-safe slug base, falling back to `workspace` when empty. */
function slugifyName(name: string): string {
  const base = name
    .normalize('NFKD') // decompose accents so combining marks strip away below
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'workspace';
}

/** Short random suffix that makes an otherwise-common slug base globally unique. */
function randomSlugSuffix(): string {
  return new ObjectId().toHexString().slice(-6);
}

/**
 * Create the user's personal workspace (with an owner membership) if they don't already have one.
 * Idempotent: an existing workspace is returned untouched, so this is safe to call at registration
 * and again lazily on first authenticated request without ever creating a duplicate for the common
 * (single-request) case.
 */
export async function provisionPersonalWorkspace(input: {
  userId: ObjectId;
  name: string;
}): Promise<Workspace> {
  const existing = await workspaceRepository.findForUser(input.userId);
  if (existing.length > 0) return pickHomeWorkspace(existing);

  const workspaceName = `${input.name}'s Workspace`.slice(0, 100);
  const slugBase = slugifyName(input.name);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    try {
      const { workspace } = await workspaceRepository.createWithOwner({
        ownerId: input.userId,
        name: workspaceName,
        slug: `${slugBase}-${randomSlugSuffix()}`,
        settings: DEFAULT_WORKSPACE_SETTINGS,
      });
      return workspace;
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        // Either a slug collision (retry with a new suffix) or a concurrent provision for the same
        // user (in which case a workspace now exists — resolve to it instead of retrying).
        const concurrent = await workspaceRepository.findForUser(input.userId);
        if (concurrent.length > 0) return pickHomeWorkspace(concurrent);
        continue;
      }
      throw error;
    }
  }

  throw new WorkspaceError(
    'Failed to provision a personal workspace after multiple attempts',
    'PROVISION_FAILED'
  );
}

/**
 * Resolve the workspace a request should operate in. Returns the user's home workspace, provisioning
 * one on the fly for legacy users. The result carries `settings` (timezone / week-start) that the
 * dashboard's day-boundary math depends on.
 */
export async function getActiveWorkspace(userId: ObjectId): Promise<Workspace> {
  const workspaces = await workspaceRepository.findForUser(userId);
  if (workspaces.length > 0) return pickHomeWorkspace(workspaces);

  const users = await getUsersCollection();
  const user = await users.findOne({ _id: userId });
  if (!user) {
    throw new WorkspaceError('User not found while resolving active workspace', 'USER_NOT_FOUND');
  }
  return provisionPersonalWorkspace({ userId, name: user.name });
}

/** Convenience for callers that only need the id. */
export async function getActiveWorkspaceId(userId: ObjectId): Promise<ObjectId> {
  return (await getActiveWorkspace(userId))._id;
}

/**
 * Deterministic choice of a user's home workspace: the earliest-created one. Stable even in the rare
 * case a concurrent lazy-provision race left a duplicate, so a given user always resolves to the
 * same workspace across requests.
 */
function pickHomeWorkspace(workspaces: Workspace[]): Workspace {
  return workspaces.reduce((earliest, w) =>
    w.createdAt < earliest.createdAt ? w : earliest
  );
}
