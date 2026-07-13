import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { tagsRepository } from '@/features/tags/repositories/tags.repository';
import { DuplicateKeyError } from '@/db/errors';

describe('tagsRepository', () => {
  it('creates and finds a tag by name within a workspace', async () => {
    const workspaceId = new ObjectId();
    await tagsRepository.create(workspaceId, { name: 'urgent', color: '#ff0000' });
    const found = await tagsRepository.findByName(workspaceId, 'urgent');
    expect(found?.color).toBe('#ff0000');
  });

  it('scopes tags by workspace', async () => {
    const wsA = new ObjectId();
    const wsB = new ObjectId();
    await tagsRepository.create(wsA, { name: 'a-only' });
    expect(await tagsRepository.findByName(wsB, 'a-only')).toBeNull();

    const listB = await tagsRepository.listByWorkspace(wsB);
    expect(listB.items).toHaveLength(0);
  });

  it('rejects a duplicate live tag name in the same workspace', async () => {
    const workspaceId = new ObjectId();
    await tagsRepository.create(workspaceId, { name: 'dup' });
    await expect(tagsRepository.create(workspaceId, { name: 'dup' })).rejects.toBeInstanceOf(
      DuplicateKeyError
    );
  });

  it('frees a tag name for reuse after soft delete (partial unique index)', async () => {
    const workspaceId = new ObjectId();
    const tag = await tagsRepository.create(workspaceId, { name: 'reusable' });
    await tagsRepository.softDeleteById(tag._id);
    // Same name can be created again because the deleted doc is excluded from the partial index.
    const recreated = await tagsRepository.create(workspaceId, { name: 'reusable' });
    expect(recreated._id.equals(tag._id)).toBe(false);
  });
});
