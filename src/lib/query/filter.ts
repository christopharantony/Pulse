import type { Filter } from 'mongodb';
import type { ObjectId } from 'mongodb';

/**
 * Filter-composition helpers. Every tenant-scoped repository threads `withWorkspaceScope` through
 * its queries; forgetting it once is a cross-tenant data leak, so it lives in one shared place.
 */

/** Inject the tenancy boundary into a filter. The first filter clause of every scoped query. */
export function withWorkspaceScope<T>(filter: Filter<T>, workspaceId: ObjectId): Filter<T> {
  return { ...filter, workspaceId } as Filter<T>;
}

/** Restrict a filter to non-soft-deleted documents (`deletedAt: null`). */
export function withNotDeleted<T>(filter: Filter<T>): Filter<T> {
  return { ...filter, deletedAt: null } as Filter<T>;
}

/** True when a value is a Mongo operator object (any key starting with `$`). */
function isOperatorObject(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).some((key) => key.startsWith('$'))
  );
}

/**
 * Build a safe equality filter from untrusted input, keeping only allow-listed keys and
 * rejecting any value that is itself an operator object. This is the NoSQL-injection guard: it
 * stops a client from smuggling `{ $ne: null }` (or `$where`, `$regex`, …) through a field that
 * was only ever meant to hold a scalar.
 */
export function buildFilter<T>(
  raw: Record<string, unknown>,
  allowList: readonly string[]
): Filter<T> {
  const out: Record<string, unknown> = {};
  for (const key of allowList) {
    const value = raw[key];
    if (value !== undefined && value !== null && !isOperatorObject(value)) {
      out[key] = value;
    }
  }
  return out as Filter<T>;
}
