import type { GoalActivityType } from '@/features/goals/repositories/goal-activity.repository';

export interface GoalActivityDto {
  id: string;
  goalId: string;
  userId: string;
  type: GoalActivityType;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
}
