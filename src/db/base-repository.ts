import 'server-only';
import {
  ObjectId,
  type Collection,
  type Document,
  type Filter,
  type OptionalUnlessRequiredId,
  type Sort,
  type UpdateFilter,
} from 'mongodb';
import { getCollection } from '@/db/client';
import { translateMongoError } from '@/db/errors';
import { buildCursorFilter, CURSOR_SORT, encodeCursor } from '@/lib/query/cursor';
import { clampLimit, type PaginatedResult } from '@/lib/query/pagination';

/**
 * BaseRepository — a function factory that produces a typed, reusable data-access module for one
 * collection (architecture doc Section 6). This is intentionally NOT a class hierarchy: it matches
 * the existing functional data-access style (see src/lib/auth/session.ts) and avoids `this`
 * binding while still giving every domain repository the same CRUD surface, cursor pagination,
 * soft-delete handling, and driver-error translation for free.
 *
 * This module is the one place allowed to cast at the driver boundary (the native driver's generic
 * Filter/Update types are famously awkward inside a generic factory). Domain repositories built on
 * top stay fully typed and cast-free.
 */

/** Fields every repository-managed document carries. The factory owns these — callers never set them. */
export interface BaseDocument extends Document {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  /** Present only on soft-deletable collections; `null` means live, a Date means trashed. */
  deletedAt?: Date | null;
}

/** Shape accepted by `insertOne`: the domain fields minus everything the factory generates. */
export type InsertInput<TDoc extends BaseDocument> = Omit<
  TDoc,
  '_id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

/** Shape accepted by `updateById`: any subset of mutable domain fields. */
export type UpdateInput<TDoc extends BaseDocument> = Partial<
  Omit<TDoc, '_id' | 'createdAt' | 'updatedAt'>
>;

export interface FindManyOptions {
  /** Opaque cursor from a previous page; omit for the first page. */
  cursor?: string | null;
  limit?: number | null;
  /** Include soft-deleted documents (default: exclude). */
  includeDeleted?: boolean;
}

export interface ReadOptions {
  includeDeleted?: boolean;
}

export interface RepositoryConfig {
  collectionName: string;
  /**
   * Whether this collection uses soft delete. Default `true`. Append-only collections
   * (time_sessions, habit_logs, notifications, analytics rollups) pass `false`: reads are not
   * filtered by `deletedAt` and `softDeleteById` throws.
   */
  softDelete?: boolean;
}

export interface Repository<TDoc extends BaseDocument> {
  /** Escape hatch: the raw typed collection, for domain-specific queries the base can't express. */
  collection(): Promise<Collection<TDoc>>;
  findById(id: ObjectId, opts?: ReadOptions): Promise<TDoc | null>;
  findOne(filter: Filter<TDoc>, opts?: ReadOptions): Promise<TDoc | null>;
  findMany(filter: Filter<TDoc>, opts?: FindManyOptions): Promise<PaginatedResult<TDoc>>;
  insertOne(input: InsertInput<TDoc>): Promise<TDoc>;
  updateById(id: ObjectId, patch: UpdateInput<TDoc>): Promise<TDoc | null>;
  /** Soft-delete by id; returns whether a live document was actually marked deleted. */
  softDeleteById(id: ObjectId): Promise<boolean>;
  /** Permanent delete by id; returns whether a document was removed. */
  hardDeleteById(id: ObjectId): Promise<boolean>;
  count(filter?: Filter<TDoc>, opts?: ReadOptions): Promise<number>;
}

export function createRepository<TDoc extends BaseDocument>(
  config: RepositoryConfig
): Repository<TDoc> {
  const softDelete = config.softDelete ?? true;
  const { collectionName } = config;

  async function coll(): Promise<Collection<TDoc>> {
    return getCollection<TDoc>(collectionName);
  }

  /** Merge the soft-delete guard into a read filter unless the caller opted into deleted docs. */
  function scopeReads(filter: Filter<TDoc>, includeDeleted?: boolean): Filter<TDoc> {
    if (softDelete && !includeDeleted) {
      return { ...(filter as Record<string, unknown>), deletedAt: null } as Filter<TDoc>;
    }
    return filter;
  }

  return {
    async collection() {
      return coll();
    },

    async findById(id, opts) {
      const c = await coll();
      const doc = await c.findOne(scopeReads({ _id: id } as Filter<TDoc>, opts?.includeDeleted));
      return doc as TDoc | null;
    },

    async findOne(filter, opts) {
      const c = await coll();
      const doc = await c.findOne(scopeReads(filter, opts?.includeDeleted));
      return doc as TDoc | null;
    },

    async findMany(filter, opts) {
      const c = await coll();
      const limit = clampLimit(opts?.limit);
      const base = scopeReads(filter, opts?.includeDeleted);
      const cursorFilter = buildCursorFilter<TDoc>(opts?.cursor);
      const finalFilter = (
        Object.keys(cursorFilter).length ? { $and: [base, cursorFilter] } : base
      ) as Filter<TDoc>;

      // Fetch one extra to detect whether a further page exists without a second count query.
      const docs = await c
        .find(finalFilter)
        .sort(CURSOR_SORT as unknown as Sort)
        .limit(limit + 1)
        .toArray();

      const hasMore = docs.length > limit;
      const items = (hasMore ? docs.slice(0, limit) : docs) as TDoc[];
      const last = items[items.length - 1];
      return {
        items,
        hasMore,
        nextCursor: hasMore && last ? encodeCursor(last) : null,
      };
    },

    async insertOne(input) {
      const c = await coll();
      const now = new Date();
      const doc = {
        ...(input as Record<string, unknown>),
        _id: new ObjectId(),
        createdAt: now,
        updatedAt: now,
        ...(softDelete ? { deletedAt: null } : {}),
      } as TDoc;
      try {
        await c.insertOne(doc as OptionalUnlessRequiredId<TDoc>);
        return doc;
      } catch (error) {
        translateMongoError(error, collectionName);
      }
    },

    async updateById(id, patch) {
      const c = await coll();
      const update = {
        $set: { ...(patch as Record<string, unknown>), updatedAt: new Date() },
      } as UpdateFilter<TDoc>;
      try {
        const doc = await c.findOneAndUpdate(scopeReads({ _id: id } as Filter<TDoc>), update, {
          returnDocument: 'after',
        });
        return doc as TDoc | null;
      } catch (error) {
        translateMongoError(error, collectionName);
      }
    },

    async softDeleteById(id) {
      if (!softDelete) {
        translateMongoError(
          new Error(`Soft delete is not enabled for collection "${collectionName}"`)
        );
      }
      const c = await coll();
      const result = await c.updateOne(
        { _id: id, deletedAt: null } as Filter<TDoc>,
        { $set: { deletedAt: new Date(), updatedAt: new Date() } } as UpdateFilter<TDoc>
      );
      return result.matchedCount > 0;
    },

    async hardDeleteById(id) {
      const c = await coll();
      const result = await c.deleteOne({ _id: id } as Filter<TDoc>);
      return result.deletedCount > 0;
    },

    async count(filter, opts) {
      const c = await coll();
      return c.countDocuments(scopeReads(filter ?? ({} as Filter<TDoc>), opts?.includeDeleted));
    },
  };
}
