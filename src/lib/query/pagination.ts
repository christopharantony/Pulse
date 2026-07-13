/**
 * Shared pagination primitives used by both cursor- and offset-based list queries.
 */

/** Default number of items returned when a caller does not specify a limit. */
export const DEFAULT_PAGE_SIZE = 20;

/** Hard upper bound on page size — protects against unbounded scans from a hostile client. */
export const MAX_PAGE_SIZE = 100;

/** Envelope returned by every cursor-paginated repository read. */
export interface PaginatedResult<T> {
  items: T[];
  /** Opaque cursor to pass back for the next page, or `null` when the last page was reached. */
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Clamp a requested limit into the `[1, MAX_PAGE_SIZE]` range, falling back to
 * {@link DEFAULT_PAGE_SIZE} when absent or invalid.
 */
export function clampLimit(limit?: number | null): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(limit), MAX_PAGE_SIZE);
}
