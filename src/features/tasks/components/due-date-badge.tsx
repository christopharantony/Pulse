import { cn } from '@/lib/utils';

interface DueDateBadgeProps {
  dueDate: string | null;
  dueHasTime?: boolean;
  completed?: boolean;
  className?: string;
}

function classify(dueDate: Date, completed: boolean): { label: string; overdue: boolean; dueSoon: boolean } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const dayDiff = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86_400_000);

  const overdue = !completed && dueDate.getTime() < now.getTime() && dayDiff < 0;
  const dueSoon = !completed && dayDiff >= 0 && dayDiff <= 1;

  let label: string;
  if (dayDiff === 0) label = 'Today';
  else if (dayDiff === 1) label = 'Tomorrow';
  else if (dayDiff === -1) label = 'Yesterday';
  else label = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { label, overdue, dueSoon };
}

/** Detects overdue / due-soon / upcoming and renders a compact date label with matching color. */
export function DueDateBadge({ dueDate, completed = false, className }: DueDateBadgeProps) {
  if (!dueDate) return null;
  const { label, overdue, dueSoon } = classify(new Date(dueDate), completed);

  return (
    <span
      className={cn(
        'shrink-0 text-caption',
        overdue ? 'font-medium text-destructive' : dueSoon ? 'font-medium text-warning' : 'text-muted-foreground',
        className
      )}
      aria-label={`Due date: ${label}${overdue ? ' (overdue)' : ''}`}
    >
      {label}
    </span>
  );
}
