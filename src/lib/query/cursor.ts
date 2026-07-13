import { ObjectId, type Filter } from 'mongodb';

/**
 * Cursor-based pagination over the canonical `{ createdAt, _id }` ordering.
 *
 * Chosen over skip/limit because skip degrades linearly as the offset grows (the server walks
 * past every skipped document) and because the cursor is a stable, opaque contract we can expose
 * through the future public API without a breaking change. The compound `(createdAt, _id)` key
 * makes ordering total even when many documents share a `createdAt`.
 *
 * IMPORTANT: cursors are only valid for the default descending `{ createdAt: -1, _id: -1 }` sort.
 * Custom-sorted list views should use offset pagination instead.
 */

/** Decoded cursor payload. `_id` is kept as hex so the cursor round-trips as pure JSON. */
interface CursorPayload {
  createdAt: string;
  id: string;
}

/** The sort every cursor query runs under. Kept in one place so encode/decode stay in agreement. */
export const CURSOR_SORT = { createdAt: -1, _id: -1 } as const;

/** Encode the last document of a page into an opaque, URL-safe cursor string. */
export function encodeCursor(doc: { createdAt: Date; _id: ObjectId }): string {
  const payload: CursorPayload = {
    createdAt: doc.createdAt.toISOString(),
    id: doc._id.toHexString(),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/** Decode a cursor string, returning `null` for any malformed or tampered value. */
export function decodeCursor(cursor: string): { createdAt: Date; id: ObjectId } | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') return null;
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    if (!ObjectId.isValid(parsed.id)) return null;
    return { createdAt, id: new ObjectId(parsed.id) };
  } catch {
    return null;
  }
}

/**
 * Build the range filter that selects documents strictly *after* a cursor under
 * {@link CURSOR_SORT}. Returns an empty filter when there is no (or an invalid) cursor, which
 * simply yields the first page.
 */
export function buildCursorFilter<T>(cursor?: string | null): Filter<T> {
  if (!cursor) return {} as Filter<T>;
  const decoded = decodeCursor(cursor);
  if (!decoded) return {} as Filter<T>;
  return {
    $or: [
      { createdAt: { $lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ],
  } as unknown as Filter<T>;
}
