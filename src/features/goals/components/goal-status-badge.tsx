import { Badge } from '@/components/ui/badge';
import type { GoalStatus } from '@/features/goals/api/goals.api';

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: 'Not started',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

const GOAL_STATUS_VARIANT: Record<GoalStatus, 'default' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  not_started: 'default',
  active: 'accent',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'destructive',
  archived: 'outline',
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return (
    <Badge variant={GOAL_STATUS_VARIANT[status]} aria-label={`Status: ${GOAL_STATUS_LABEL[status]}`}>
      {GOAL_STATUS_LABEL[status]}
    </Badge>
  );
}
