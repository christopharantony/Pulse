import { z } from 'zod';
import { MAX_PAGE_SIZE } from '@/lib/query/pagination';

/**
 * Shared query-input schemas for list endpoints. Kept cross-feature so every list route validates
 * pagination/sort the same way and the limit ceiling is defined in exactly one place.
 */

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});
export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

export const offsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});
export type OffsetPaginationInput = z.infer<typeof offsetPaginationSchema>;

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});
export type SortInput = z.infer<typeof sortSchema>;
