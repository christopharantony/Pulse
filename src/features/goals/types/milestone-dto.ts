import type { MilestoneStatus } from '@/features/goals/types/milestone';

export interface MilestoneDto {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedDate: string | null;
  order: number;
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}
