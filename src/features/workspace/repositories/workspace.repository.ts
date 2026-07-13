import 'server-only';
import { ObjectId, type Filter, type OptionalUnlessRequiredId } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { getCollection } from '@/db/client';
import { COLLECTIONS } from '@/db/collections';
import { translateMongoError } from '@/db/errors';
import { withTransaction } from '@/db/transaction';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  type Workspace,
  type WorkspaceSettings,
} from '@/features/workspace/types/workspace';
import type { WorkspaceMember } from '@/features/workspace/types/workspace-member';

const base = createRepository<Workspace>({ collectionName: COLLECTIONS.workspaces });

/** Look up a workspace by its unique slug (live workspaces only). */
async function findBySlug(slug: string): Promise<Workspace | null> {
  return base.findOne({ slug } as Filter<Workspace>);
}

/**
 * Create a workspace and its owner membership atomically. The two inserts must both succeed or
 * both roll back — a workspace with no owner (or an orphan membership) is an invalid state — so
 * this runs in a transaction (see db/transaction.ts and its replica-set caveat). Bypasses the base
 * `insertOne` because that helper cannot thread a ClientSession through the driver call.
 */
async function createWithOwner(input: {
  ownerId: ObjectId;
  name: string;
  slug: string;
  settings?: WorkspaceSettings;
}): Promise<{ workspace: Workspace; member: WorkspaceMember }> {
  const now = new Date();
  const workspace: Workspace = {
    _id: new ObjectId(),
    name: input.name,
    slug: input.slug,
    ownerId: input.ownerId,
    plan: 'personal',
    settings: input.settings ?? DEFAULT_WORKSPACE_SETTINGS,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const member: WorkspaceMember = {
    _id: new ObjectId(),
    workspaceId: workspace._id,
    userId: input.ownerId,
    role: 'owner',
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await withTransaction(async (session) => {
      const workspaces = await getCollection<Workspace>(COLLECTIONS.workspaces);
      const members = await getCollection<WorkspaceMember>(COLLECTIONS.workspaceMembers);
      await workspaces.insertOne(workspace as OptionalUnlessRequiredId<Workspace>, { session });
      await members.insertOne(member as OptionalUnlessRequiredId<WorkspaceMember>, { session });
      return { workspace, member };
    });
  } catch (error) {
    translateMongoError(error, COLLECTIONS.workspaces);
  }
}

/** All live workspaces the user belongs to, resolved through their memberships. */
async function findForUser(userId: ObjectId): Promise<Workspace[]> {
  const members = await getCollection<WorkspaceMember>(COLLECTIONS.workspaceMembers);
  const memberships = await members.find({ userId }).toArray();
  const workspaceIds = memberships.map((m) => m.workspaceId);
  if (workspaceIds.length === 0) return [];
  const workspaces = await getCollection<Workspace>(COLLECTIONS.workspaces);
  const docs = await workspaces
    .find({ _id: { $in: workspaceIds }, deletedAt: null } as Filter<Workspace>)
    .toArray();
  return docs as Workspace[];
}

export const workspaceRepository = {
  ...base,
  findBySlug,
  createWithOwner,
  findForUser,
};
