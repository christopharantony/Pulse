'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { ListChecks } from 'lucide-react';
import { MilestoneItem } from '@/features/goals/components/milestone-item';
import { MilestoneFormDialog } from '@/features/goals/components/milestone-form-dialog';
import { useMilestones } from '@/features/goals/hooks/use-milestones';
import { useReorderMilestones } from '@/features/goals/hooks/use-milestone-mutations';

interface MilestoneListProps {
  goalId: string;
}

export function MilestoneList({ goalId }: MilestoneListProps) {
  const { data: milestones, isLoading } = useMilestones(goalId);
  const reorderMilestones = useReorderMilestones();

  function move(index: number, direction: -1 | 1) {
    if (!milestones) return;
    const target = index + direction;
    if (target < 0 || target >= milestones.length) return;
    const orderedIds = milestones.map((m) => m.id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];
    reorderMilestones.mutate({ goalId, orderedIds });
  }

  return (
    <div className="flex flex-col gap-4">
      <MilestoneFormDialog goalId={goalId} />

      {isLoading && <TableSkeleton rows={3} columns={1} />}

      {!isLoading && (!milestones || milestones.length === 0) && (
        <EmptyState icon={<ListChecks />} title="No milestones yet" description="Break this goal into checkpoints." />
      )}

      {!isLoading && milestones && milestones.length > 0 && (
        <ul className="flex flex-col" role="list">
          {milestones.map((milestone, index) => (
            <MilestoneItem
              key={milestone.id}
              goalId={goalId}
              milestone={milestone}
              canMoveUp={index > 0}
              canMoveDown={index < milestones.length - 1}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
