import { Badge } from '@/components/ui/badge';
import type { GoalPriority } from '@/features/goals/api/goals.api';

export const GOAL_PRIORITY_LABEL: Record<GoalPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const GOAL_PRIORITY_VARIANT: Record<GoalPriority, 'default' | 'accent' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'accent',
  high: 'warning',
  critical: 'destructive',
};

export function GoalPriorityBadge({ priority }: { priority: GoalPriority }) {
  return (
    <Badge variant={GOAL_PRIORITY_VARIANT[priority]} aria-label={`Priority: ${GOAL_PRIORITY_LABEL[priority]}`}>
      {GOAL_PRIORITY_LABEL[priority]}
    </Badge>
  );
}
