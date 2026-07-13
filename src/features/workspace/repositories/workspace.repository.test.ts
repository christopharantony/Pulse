import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { workspaceRepository } from '@/features/workspace/repositories/workspace.repository';
import { workspaceMemberRepository } from '@/features/workspace/repositories/workspace-member.repository';
import { DuplicateKeyError } from '@/db/errors';

describe('workspaceRepository', () => {
  it('creates a workspace with an owner membership atomically', async () => {
    const ownerId = new ObjectId();
    const { workspace, member } = await workspaceRepository.createWithOwner({
      ownerId,
      name: 'Personal',
      slug: 'personal-1',
    });

    expect(workspace.ownerId).toEqual(ownerId);
    expect(workspace.plan).toBe('personal');
    expect(member.role).toBe('owner');
    expect(member.workspaceId).toEqual(workspace._id);

    // The membership is queryable, proving both inserts committed.
    const membership = await workspaceMemberRepository.findMembership(workspace._id, ownerId);
    expect(membership).not.toBeNull();
  });

  it('rejects a duplicate slug', async () => {
    const ownerId = new ObjectId();
    await workspaceRepository.createWithOwner({ ownerId, name: 'A', slug: 'dupe-slug' });
    await expect(
      workspaceRepository.createWithOwner({ ownerId, name: 'B', slug: 'dupe-slug' })
    ).rejects.toBeInstanceOf(DuplicateKeyError);
  });

  it('rolls back the membership when the workspace insert fails', async () => {
    const ownerId = new ObjectId();
    await workspaceRepository.createWithOwner({ ownerId, name: 'A', slug: 'rollback-slug' });

    const membersBefore = await workspaceMemberRepository.listMembers(new ObjectId());
    await expect(
      workspaceRepository.createWithOwner({ ownerId, name: 'B', slug: 'rollback-slug' })
    ).rejects.toBeInstanceOf(DuplicateKeyError);

    // No orphaned membership should have been created for the failed second attempt.
    const orphanCount = await workspaceMemberRepository.count({ userId: ownerId } as never);
    expect(orphanCount).toBe(1);
    expect(membersBefore).toHaveLength(0);
  });

  it('finds all workspaces a user belongs to', async () => {
    const userId = new ObjectId();
    const otherUser = new ObjectId();
    const a = await workspaceRepository.createWithOwner({ ownerId: userId, name: 'A', slug: 'ws-a' });
    const b = await workspaceRepository.createWithOwner({ ownerId: userId, name: 'B', slug: 'ws-b' });
    await workspaceRepository.createWithOwner({ ownerId: otherUser, name: 'C', slug: 'ws-c' });

    const mine = await workspaceRepository.findForUser(userId);
    const slugs = mine.map((w) => w.slug).sort();
    expect(slugs).toEqual(['ws-a', 'ws-b']);
    expect(mine.map((w) => w._id.toHexString())).toContain(a.workspace._id.toHexString());
    expect(mine.map((w) => w._id.toHexString())).toContain(b.workspace._id.toHexString());
  });

  it('finds a workspace by slug and excludes soft-deleted ones', async () => {
    const ownerId = new ObjectId();
    const { workspace } = await workspaceRepository.createWithOwner({
      ownerId,
      name: 'Findable',
      slug: 'findable',
    });
    expect(await workspaceRepository.findBySlug('findable')).not.toBeNull();

    await workspaceRepository.softDeleteById(workspace._id);
    expect(await workspaceRepository.findBySlug('findable')).toBeNull();
  });
});

describe('workspaceMemberRepository', () => {
  it('enforces one membership per (workspace, user)', async () => {
    const workspaceId = new ObjectId();
    const userId = new ObjectId();
    await workspaceMemberRepository.addMember({ workspaceId, userId, role: 'member' });
    await expect(
      workspaceMemberRepository.addMember({ workspaceId, userId, role: 'viewer' })
    ).rejects.toBeInstanceOf(DuplicateKeyError);
  });

  it('updates and removes a member', async () => {
    const workspaceId = new ObjectId();
    const userId = new ObjectId();
    await workspaceMemberRepository.addMember({ workspaceId, userId, role: 'member' });

    const updated = await workspaceMemberRepository.updateRole(workspaceId, userId, 'admin');
    expect(updated?.role).toBe('admin');

    expect(await workspaceMemberRepository.removeMember(workspaceId, userId)).toBe(true);
    expect(await workspaceMemberRepository.findMembership(workspaceId, userId)).toBeNull();
  });
});
