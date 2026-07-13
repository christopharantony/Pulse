import { useSensor, useSensors, KeyboardSensor, PointerSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Shared dnd-kit sensor config: `PointerSensor` with a small activation distance so drags don't
 * fight normal scrolling/tapping on touch, plus `KeyboardSensor` for full keyboard operability
 * (Space to pick up, arrows to move, Space to drop, Escape to cancel) — the reason dnd-kit was
 * chosen over alternatives that lack this built in.
 */
export function useTaskDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}
