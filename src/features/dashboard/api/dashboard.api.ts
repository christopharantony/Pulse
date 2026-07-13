import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';
import type {
  DashboardOverview,
  RecentTaskItem,
  RecentTasksData,
} from '@/features/dashboard/types/dashboard';

export interface HabitCompletionResult {
  completedToday: boolean;
  currentStreak: number;
}

export interface QuickCreateTaskInput {
  title: string;
  dueDate?: string | null;
  priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  projectId?: string | null;
}

export async function fetchDashboard(month?: string): Promise<DashboardOverview> {
  const { data } = await api.get<ApiEnvelope<DashboardOverview>>('/dashboard', {
    params: month ? { month } : undefined,
  });
  return data.data;
}

export async function fetchRecentTasks(offset: number, limit?: number): Promise<RecentTasksData> {
  const { data } = await api.get<ApiEnvelope<RecentTasksData>>('/dashboard/recent-tasks', {
    params: { offset, ...(limit ? { limit } : {}) },
  });
  return data.data;
}

export async function completeHabitRequest(habitId: string): Promise<HabitCompletionResult> {
  const { data } = await api.post<ApiEnvelope<HabitCompletionResult>>(
    `/habits/${habitId}/complete`
  );
  return data.data;
}

export async function quickCreateTaskRequest(input: QuickCreateTaskInput): Promise<RecentTaskItem> {
  const { data } = await api.post<ApiEnvelope<RecentTaskItem>>('/tasks', input);
  return data.data;
}
