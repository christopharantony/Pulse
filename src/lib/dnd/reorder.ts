/**
 * Pure order-value helpers shared by the board/list drag handlers. Mirrors the server's float-gap
 * scheme (`TASK_ORDER_GAP`/`renumberOrders` in `tasks.repository.ts`) so the client-predicted order
 * the optimistic update writes matches what the server will persist.
 */

const ORDER_GAP = 1000;

/** Items must carry an `order` field and be sorted ascending by it. */
interface Ordered {
  order: number;
}

/**
 * Compute the order value for an item being dropped at `targetIndex` within `siblings` (the
 * destination column's items, ascending by order, with the dragged item already removed).
 */
export function computeDropOrder(siblings: Ordered[], targetIndex: number): number {
  if (siblings.length === 0) return ORDER_GAP;

  const before = siblings[targetIndex - 1];
  const after = siblings[targetIndex];

  if (!before && after) return after.order - ORDER_GAP;
  if (before && !after) return before.order + ORDER_GAP;
  if (before && after) return (before.order + after.order) / 2;

  return ORDER_GAP;
}
