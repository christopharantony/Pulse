import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';

export type MilestoneStatus = 'pending' | 'completed';

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

export interface CreateMilestoneInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

export type UpdateMilestoneInput = Partial<CreateMilestoneInput>;

export async function fetchMilestones(goalId: string): Promise<MilestoneDto[]> {
  const { data } = await api.get<ApiEnvelope<MilestoneDto[]>>(`/goals/${goalId}/milestones`);
  return data.data;
}

export async function createMilestoneRequest(goalId: string, input: CreateMilestoneInput): Promise<MilestoneDto> {
  const { data } = await api.post<ApiEnvelope<MilestoneDto>>(`/goals/${goalId}/milestones`, input);
  return data.data;
}

export async function updateMilestoneRequest(
  goalId: string,
  milestoneId: string,
  input: UpdateMilestoneInput
): Promise<MilestoneDto> {
  const { data } = await api.patch<ApiEnvelope<MilestoneDto>>(`/goals/${goalId}/milestones/${milestoneId}`, input);
  return data.data;
}

export async function deleteMilestoneRequest(goalId: string, milestoneId: string): Promise<void> {
  await api.delete(`/goals/${goalId}/milestones/${milestoneId}`);
}

export async function completeMilestoneRequest(goalId: string, milestoneId: string): Promise<MilestoneDto> {
  const { data } = await api.post<ApiEnvelope<MilestoneDto>>(`/goals/${goalId}/milestones/${milestoneId}/complete`);
  return data.data;
}

export async function reorderMilestonesRequest(goalId: string, orderedIds: string[]): Promise<MilestoneDto[]> {
  const { data } = await api.post<ApiEnvelope<MilestoneDto[]>>(`/goals/${goalId}/milestones/reorder`, { orderedIds });
  return data.data;
}
