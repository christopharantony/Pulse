import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { projectsRepository } from '@/features/projects/repositories/projects.repository';

describe('projectsRepository', () => {
  it('creates a project and excludes archived ones by default', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    const active = await projectsRepository.create(workspaceId, createdBy, { name: 'Active' });
    const archived = await projectsRepository.create(workspaceId, createdBy, { name: 'Archived' });
    await projectsRepository.setArchived(archived._id, true);

    const visible = await projectsRepository.listByWorkspace(workspaceId);
    expect(visible.items.map((p) => p.name)).toEqual(['Active']);
    expect(visible.items[0]._id.toHexString()).toBe(active._id.toHexString());

    const all = await projectsRepository.listByWorkspace(workspaceId, { includeArchived: true });
    expect(all.items).toHaveLength(2);
  });

  it('scopes projects by workspace', async () => {
    const createdBy = new ObjectId();
    await projectsRepository.create(new ObjectId(), createdBy, { name: 'Theirs' });
    const mine = await projectsRepository.listByWorkspace(new ObjectId());
    expect(mine.items).toHaveLength(0);
  });
});
