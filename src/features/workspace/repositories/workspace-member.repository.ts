import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type { WorkspaceMember, WorkspaceRole } from '@/features/workspace/types/workspace-member';

// Append-only in the soft-delete sense: a removed member is hard-deleted, not flagged.
const base = createRepository<WorkspaceMember>({
  collectionName: COLLECTIONS.workspaceMembers,
  softDelete: false,
});

async function addMember(input: {
  workspaceId: ObjectId;
  userId: ObjectId;
  role: WorkspaceRole;
}): Promise<WorkspaceMember> {
  return base.insertOne(input);
}

/** The membership record for a (workspace, user) pair, or null if the user is not a member. */
async function findMembership(
  workspaceId: ObjectId,
  userId: ObjectId
): Promise<WorkspaceMember | null> {
  return base.findOne({ workspaceId, userId } as Filter<WorkspaceMember>);
}

async function listMembers(workspaceId: ObjectId): Promise<WorkspaceMember[]> {
  const collection = await base.collection();
  return collection.find({ workspaceId } as Filter<WorkspaceMember>).toArray() as Promise<
    WorkspaceMember[]
  >;
}

async function updateRole(
  workspaceId: ObjectId,
  userId: ObjectId,
  role: WorkspaceRole
): Promise<WorkspaceMember | null> {
  const collection = await base.collection();
  const doc = await collection.findOneAndUpdate(
    { workspaceId, userId } as Filter<WorkspaceMember>,
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return doc as WorkspaceMember | null;
}

async function removeMember(workspaceId: ObjectId, userId: ObjectId): Promise<boolean> {
  const collection = await base.collection();
  const result = await collection.deleteOne({ workspaceId, userId } as Filter<WorkspaceMember>);
  return result.deletedCount > 0;
}

export const workspaceMemberRepository = {
  ...base,
  addMember,
  findMembership,
  listMembers,
  updateRole,
  removeMember,
};
