import { Badge } from '@/components/ui/badge';
import type { HabitType } from '@/features/habits/types/habit';

export const HABIT_TYPE_LABEL: Record<HabitType, string> = {
  boolean: 'Simple',
  numeric: 'Numeric',
  duration: 'Duration',
  checklist: 'Checklist',
};

export function HabitTypeBadge({ type }: { type: HabitType }) {
  return (
    <Badge variant="outline" aria-label={`Habit type: ${HABIT_TYPE_LABEL[type]}`}>
      {HABIT_TYPE_LABEL[type]}
    </Badge>
  );
}
