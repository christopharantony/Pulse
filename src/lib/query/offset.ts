import { clampLimit } from '@/lib/query/pagination';

/**
 * Offset-based pagination for simple/admin list views where a stable cursor is unnecessary.
 * Cursor pagination remains the default for user-facing feeds (see cursor.ts); offset is offered
 * for cases that genuinely need page numbers and total counts.
 */

/** Envelope for an offset-paginated read. */
export interface OffsetResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Resolve a `(page, limit)` request into driver `skip`/`limit` plus the normalised values. */
export function buildOffset(
  page?: number | null,
  limit?: number | null
): { skip: number; limit: number; page: number; pageSize: number } {
  const pageSize = clampLimit(limit);
  const safePage = page && Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return { skip: (safePage - 1) * pageSize, limit: pageSize, page: safePage, pageSize };
}

/** Assemble an {@link OffsetResult} from a fetched page and the total matching count. */
export function toOffsetResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): OffsetResult<T> {
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
