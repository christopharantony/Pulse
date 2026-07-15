import type { GoalHabitContributionType } from '@/features/goals/types/goal-habit-link';

export interface GoalHabitLinkDto {
  id: string;
  goalId: string;
  habitId: string;
  contributionType: GoalHabitContributionType;
  contributionWeight: number;
  createdAt: string;
  updatedAt: string;
}
