import { Badge } from '@/components/ui/badge';
import type { TaskPriority } from '@/features/tasks/types/task';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: 'default' | 'accent' | 'warning' | 'destructive' }> = {
  none: { label: 'No priority', variant: 'default' },
  low: { label: 'Low', variant: 'default' },
  medium: { label: 'Medium', variant: 'accent' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === 'none') return null;
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge variant={config.variant} aria-label={`Priority: ${config.label}`}>
      {config.label}
    </Badge>
  );
}
