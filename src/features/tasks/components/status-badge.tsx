import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/features/tasks/types/task';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  todo: 'To do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

const STATUS_VARIANT: Record<TaskStatus, 'default' | 'accent' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  inbox: 'default',
  todo: 'outline',
  in_progress: 'accent',
  waiting: 'warning',
  completed: 'success',
  cancelled: 'destructive',
  archived: 'default',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} aria-label={`Status: ${STATUS_LABEL[status]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
