'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { useGoalActivity } from '@/features/goals/hooks/use-goal-activity';

const ACTIVITY_LABEL: Record<string, string> = {
  created: 'Goal created',
  updated: 'Goal updated',
  status_changed: 'Status changed',
  milestone_added: 'Milestone added',
  milestone_completed: 'Milestone completed',
  milestone_deleted: 'Milestone removed',
  task_attached: 'Task attached',
  task_detached: 'Task detached',
  task_completed: 'Linked task completed',
  habit_linked: 'Habit linked',
  habit_unlinked: 'Habit unlinked',
  progress_updated: 'Progress updated',
  completed: 'Goal completed',
  archived: 'Goal archived',
  restored: 'Goal restored',
  deleted: 'Goal deleted',
};

interface GoalActivityTimelineProps {
  goalId: string;
}

export function GoalActivityTimeline({ goalId }: GoalActivityTimelineProps) {
  const { data: activity, isLoading } = useGoalActivity(goalId);

  if (isLoading) return <TableSkeleton rows={4} columns={1} />;

  if (!activity || activity.length === 0) {
    return <EmptyState title="No activity yet" description="Changes to this goal will show up here." />;
  }

  return (
    <ol className="flex flex-col gap-3" role="list">
      {activity.map((event) => (
        <li key={event.id} className="flex items-start gap-3 text-small">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <div className="flex flex-col">
            <span className="text-foreground">{ACTIVITY_LABEL[event.type] ?? event.type}</span>
            {(event.fromValue || event.toValue) && (
              <span className="text-caption text-muted-foreground">
                {event.fromValue && `${event.fromValue} → `}
                {event.toValue}
              </span>
            )}
            <span className="text-caption text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
