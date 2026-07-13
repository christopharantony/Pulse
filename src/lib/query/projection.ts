/**
 * Projection helpers. List views and detail views are different read shapes: list views exclude
 * heavy fields (rich-text bodies, long embedded arrays) so the wire payload and working set stay
 * small. Building the projection explicitly beats fetch-then-trim in application code.
 */

/** Build an inclusion projection (`{ field: 1 }`). `_id` is included by Mongo unless excluded. */
export function includeFields(fields: readonly string[]): Record<string, 1> {
  return Object.fromEntries(fields.map((field) => [field, 1]));
}

/** Build an exclusion projection (`{ field: 0 }`) — the common case for list views. */
export function excludeFields(fields: readonly string[]): Record<string, 0> {
  return Object.fromEntries(fields.map((field) => [field, 0]));
}
