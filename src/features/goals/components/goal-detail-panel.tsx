'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/error-state';
import { CardSkeleton } from '@/components/feedback/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GoalActionsMenu } from '@/features/goals/components/goal-actions-menu';
import { GoalCategoryBadge } from '@/features/goals/components/goal-category-badge';
import { GoalPriorityBadge } from '@/features/goals/components/goal-priority-badge';
import { GoalStatusBadge } from '@/features/goals/components/goal-status-badge';
import { GoalProgressRing } from '@/features/goals/components/goal-progress-ring';
import { GoalManualProgress } from '@/features/goals/components/goal-manual-progress';
import { GoalTimeline } from '@/features/goals/components/goal-timeline';
import { GoalEditDialog } from '@/features/goals/components/goal-edit-dialog';
import { MilestoneList } from '@/features/goals/components/milestone-list';
import { GoalLinkedTasks } from '@/features/goals/components/goal-linked-tasks';
import { GoalLinkedHabits } from '@/features/goals/components/goal-linked-habits';
import { GoalHabitLinkDialog } from '@/features/goals/components/goal-habit-link-dialog';
import { GoalActivityTimeline } from '@/features/goals/components/goal-activity-timeline';
import { GoalStatisticsCharts } from '@/features/goals/components/goal-statistics-charts';
import { useGoal } from '@/features/goals/hooks/use-goal';

interface GoalDetailPanelProps {
  goalId: string;
  onBack?: () => void;
}

export function GoalDetailPanel({ goalId, onBack }: GoalDetailPanelProps) {
  const { data: goal, isLoading, isError } = useGoal(goalId);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <CardSkeleton />;
  if (isError || !goal) {
    return <ErrorState title="Goal not found" description="It may have been deleted or archived." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {onBack && (
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
        <GoalActionsMenu
          goalId={goal.id}
          archived={goal.status === 'archived'}
          completed={goal.status === 'completed'}
          onEdit={() => setEditing(true)}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-h1 text-foreground">
              {goal.icon ? `${goal.icon} ` : ''}
              {goal.title}
            </span>
          </div>
          {goal.description && <p className="text-small text-muted-foreground">{goal.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <GoalStatusBadge status={goal.status} />
            <GoalCategoryBadge category={goal.category} customLabel={goal.customCategoryLabel} />
            <GoalPriorityBadge priority={goal.priority} />
          </div>
        </div>
        <GoalProgressRing progressPct={goal.progressPct} />
      </div>

      {(goal.progressMethod === 'manual' || goal.progressMethod === 'habit') && <GoalManualProgress goal={goal} />}

      <GoalTimeline goal={goal} />

      <Tabs defaultValue="milestones">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="habits">Habits</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="milestones">
          <MilestoneList goalId={goal.id} />
        </TabsContent>
        <TabsContent value="tasks">
          <GoalLinkedTasks goalId={goal.id} />
        </TabsContent>
        <TabsContent value="habits">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <GoalHabitLinkDialog
                goalId={goal.id}
                trigger={
                  <Button type="button" size="sm" variant="outline">
                    Link habit
                  </Button>
                }
              />
            </div>
            <GoalLinkedHabits goalId={goal.id} />
          </div>
        </TabsContent>
        <TabsContent value="statistics">
          <GoalStatisticsCharts goalId={goal.id} />
        </TabsContent>
        <TabsContent value="activity">
          <GoalActivityTimeline goalId={goal.id} />
        </TabsContent>
      </Tabs>

      <GoalEditDialog goal={goal} open={editing} onOpenChange={setEditing} />
    </div>
  );
}
