import type { Filter } from 'mongodb';

/**
 * Build a text-search filter fragment for collections that carry a `$text` index (tasks, notes).
 * Returns an empty filter for blank input so it composes cleanly into a larger query. This is a
 * deliberate floor, not a ceiling: once search needs fuzzy matching or cross-entity ranking, that
 * is the signal to move to Atlas Search or an external engine rather than tuning `$text`.
 */
export function buildTextSearch<T>(term: string | undefined | null): Filter<T> {
  const trimmed = term?.trim();
  if (!trimmed) return {} as Filter<T>;
  return { $text: { $search: trimmed } } as unknown as Filter<T>;
}
