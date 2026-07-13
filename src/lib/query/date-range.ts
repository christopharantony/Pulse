import type { Filter } from 'mongodb';

/**
 * Build an inclusive date-range filter on a single field, omitting whichever bound is absent.
 * Returns an empty filter when neither bound is given, so it composes into a larger query without
 * special-casing. Used by calendar, timesheet, and analytics range reads.
 */
export function buildDateRange<T>(
  field: string,
  from?: Date | null,
  to?: Date | null
): Filter<T> {
  if (!from && !to) return {} as Filter<T>;
  const range: Record<string, Date> = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return { [field]: range } as unknown as Filter<T>;
}
