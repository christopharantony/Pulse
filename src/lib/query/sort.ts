import type { Sort } from 'mongodb';

export type SortDirection = 'asc' | 'desc';

/**
 * Build a Mongo sort from untrusted input against an allow-list of sortable fields. Rejecting
 * non-allow-listed fields prevents index-less sorts (a minor DoS surface). `_id` is appended as a
 * tiebreaker so ordering is always total and pagination stays stable across equal primary keys.
 */
export function buildSort(
  field: string | undefined | null,
  direction: SortDirection | undefined | null,
  allowList: readonly string[],
  fallback: Sort = { createdAt: -1, _id: -1 }
): Sort {
  if (!field || !allowList.includes(field)) return fallback;
  const dir = direction === 'asc' ? 1 : -1;
  return { [field]: dir, _id: dir };
}
