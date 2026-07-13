import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { createRepository, type BaseDocument } from '@/db/base-repository';
import { getCollection } from '@/db/client';
import { DuplicateKeyError } from '@/db/errors';
import { toObjectId } from '@/lib/mongo/object-id';
import { InvalidObjectIdError } from '@/db/errors';

/**
 * Exercises the base-repository factory (and, transitively, the whole test harness: in-memory
 * replica set, connection, index creation) against a throwaway collection, so the generic CRUD /
 * pagination / soft-delete / error-translation behaviour is proven once rather than re-tested in
 * every domain suite.
 */

interface Widget extends BaseDocument {
  workspaceId: ObjectId;
  name: string;
}

const COLLECTION = 'test_widgets';
const repo = createRepository<Widget>({ collectionName: COLLECTION });
const appendOnlyRepo = createRepository<Widget>({
  collectionName: 'test_widgets_append',
  softDelete: false,
});

describe('base repository', () => {
  beforeAll(async () => {
    const c = await getCollection(COLLECTION);
    await c.createIndex({ workspaceId: 1, name: 1 }, { unique: true });
  });

  beforeEach(async () => {
    // Not in the COLLECTIONS registry, so the global beforeEach doesn't clear it.
    await (await getCollection(COLLECTION)).deleteMany({});
    await (await getCollection('test_widgets_append')).deleteMany({});
  });

  it('inserts a document with generated _id and timestamps', async () => {
    const workspaceId = new ObjectId();
    const doc = await repo.insertOne({ workspaceId, name: 'alpha' });
    expect(doc._id).toBeInstanceOf(ObjectId);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
    expect(doc.deletedAt).toBeNull();

    const found = await repo.findById(doc._id);
    expect(found?.name).toBe('alpha');
  });

  it('throws DuplicateKeyError on a unique-index violation', async () => {
    const workspaceId = new ObjectId();
    await repo.insertOne({ workspaceId, name: 'dup' });
    await expect(repo.insertOne({ workspaceId, name: 'dup' })).rejects.toBeInstanceOf(
      DuplicateKeyError
    );
  });

  it('throws InvalidObjectIdError for a malformed id string', () => {
    expect(() => toObjectId('not-an-id')).toThrow(InvalidObjectIdError);
  });

  it('updates a document and bumps updatedAt', async () => {
    const doc = await repo.insertOne({ workspaceId: new ObjectId(), name: 'before' });
    const updated = await repo.updateById(doc._id, { name: 'after' });
    expect(updated?.name).toBe('after');
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(doc.updatedAt.getTime());
  });

  it('soft-deletes: hidden by default, visible with includeDeleted', async () => {
    const doc = await repo.insertOne({ workspaceId: new ObjectId(), name: 'trash-me' });
    expect(await repo.softDeleteById(doc._id)).toBe(true);
    expect(await repo.findById(doc._id)).toBeNull();
    expect(await repo.findById(doc._id, { includeDeleted: true })).not.toBeNull();
    // Second soft-delete is a no-op (already deleted).
    expect(await repo.softDeleteById(doc._id)).toBe(false);
  });

  it('refuses soft delete on an append-only repository', async () => {
    const doc = await appendOnlyRepo.insertOne({ workspaceId: new ObjectId(), name: 'x' });
    expect(doc.deletedAt).toBeUndefined();
    await expect(appendOnlyRepo.softDeleteById(doc._id)).rejects.toThrow();
  });

  it('cursor-paginates in descending createdAt order and stops at the end', async () => {
    const workspaceId = new ObjectId();
    for (let i = 0; i < 5; i++) {
      const doc = await repo.insertOne({ workspaceId, name: `n${i}` });
      // Force distinct, increasing createdAt so ordering is deterministic.
      await (await getCollection(COLLECTION)).updateOne(
        { _id: doc._id },
        { $set: { createdAt: new Date(Date.now() + i * 1000) } }
      );
    }

    const page1 = await repo.findMany({ workspaceId } as never, { limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).not.toBeNull();
    // Newest first.
    expect(page1.items[0].name).toBe('n4');

    const page2 = await repo.findMany({ workspaceId } as never, {
      limit: 2,
      cursor: page1.nextCursor,
    });
    expect(page2.items[0].name).toBe('n2');

    const page3 = await repo.findMany({ workspaceId } as never, {
      limit: 2,
      cursor: page2.nextCursor,
    });
    expect(page3.items).toHaveLength(1);
    expect(page3.hasMore).toBe(false);
    expect(page3.nextCursor).toBeNull();
  });

  it('count respects the soft-delete guard', async () => {
    const workspaceId = new ObjectId();
    const a = await repo.insertOne({ workspaceId, name: 'a' });
    await repo.insertOne({ workspaceId, name: 'b' });
    await repo.softDeleteById(a._id);
    expect(await repo.count({ workspaceId } as never)).toBe(1);
    expect(await repo.count({ workspaceId } as never, { includeDeleted: true })).toBe(2);
  });
});
