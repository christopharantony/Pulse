import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';

export type GoalStatus = 'not_started' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalCategory =
  | 'personal'
  | 'career'
  | 'health'
  | 'finance'
  | 'learning'
  | 'business'
  | 'relationships'
  | 'custom';
export type GoalProgressMethod = 'manual' | 'milestone' | 'task' | 'habit' | 'mixed';
export type GoalVisibility = 'private' | 'workspace';

export interface GoalDto {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: GoalCategory;
  customCategoryLabel: string | null;
  status: GoalStatus;
  priority: GoalPriority;
  progressMethod: GoalProgressMethod;
  startDate: string | null;
  targetDate: string | null;
  completionDate: string | null;
  targetValue: number | null;
  currentValue: number;
  progressPct: number;
  visibility: GoalVisibility;
  tagIds: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalListQuery {
  status?: GoalStatus[];
  priority?: GoalPriority[];
  category?: GoalCategory[];
  progressMin?: number;
  progressMax?: number;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface GoalListResult {
  items: GoalDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  category?: GoalCategory;
  customCategoryLabel?: string | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  progressMethod?: GoalProgressMethod;
  startDate?: string | null;
  targetDate?: string | null;
  targetValue?: number | null;
  visibility?: GoalVisibility;
  tagIds?: string[];
}

export type UpdateGoalInput = Partial<Omit<CreateGoalInput, 'status'>>;

export async function fetchGoals(query: GoalListQuery = {}): Promise<GoalListResult> {
  const { data } = await api.get<ApiEnvelope<GoalListResult>>('/goals', {
    params: query,
    paramsSerializer: { indexes: null },
  });
  return data.data;
}

export async function fetchGoal(id: string): Promise<GoalDto> {
  const { data } = await api.get<ApiEnvelope<GoalDto>>(`/goals/${id}`);
  return data.data;
}

export async function createGoalRequest(input: CreateGoalInput): Promise<GoalDto> {
  const { data } = await api.post<ApiEnvelope<GoalDto>>('/goals', input);
  return data.data;
}

export async function updateGoalRequest(id: string, input: UpdateGoalInput): Promise<GoalDto> {
  const { data } = await api.patch<ApiEnvelope<GoalDto>>(`/goals/${id}`, input);
  return data.data;
}

export async function deleteGoalRequest(id: string): Promise<void> {
  await api.delete(`/goals/${id}`);
}

export async function restoreGoalRequest(id: string): Promise<GoalDto> {
  const { data } = await api.post<ApiEnvelope<GoalDto>>(`/goals/${id}/restore`);
  return data.data;
}

export async function permanentDeleteGoalRequest(id: string): Promise<void> {
  await api.delete(`/goals/${id}/permanent`);
}

export async function archiveGoalRequest(id: string): Promise<GoalDto> {
  const { data } = await api.post<ApiEnvelope<GoalDto>>(`/goals/${id}/archive`);
  return data.data;
}

export async function unarchiveGoalRequest(id: string): Promise<GoalDto> {
  const { data } = await api.post<ApiEnvelope<GoalDto>>(`/goals/${id}/unarchive`);
  return data.data;
}

export async function completeGoalRequest(id: string): Promise<GoalDto> {
  const { data } = await api.post<ApiEnvelope<GoalDto>>(`/goals/${id}/complete`);
  return data.data;
}

export async function updateGoalStatusRequest(id: string, status: GoalStatus): Promise<GoalDto> {
  const { data } = await api.post<ApiEnvelope<GoalDto>>(`/goals/${id}/status`, { status });
  return data.data;
}

export async function updateGoalProgressRequest(
  id: string,
  input: { currentValue?: number; progressPct?: number }
): Promise<GoalDto> {
  const { data } = await api.patch<ApiEnvelope<GoalDto>>(`/goals/${id}/progress`, input);
  return data.data;
}

export async function fetchGoalTrash(): Promise<GoalDto[]> {
  const { data } = await api.get<ApiEnvelope<GoalDto[]>>('/goals/trash');
  return data.data;
}

export async function searchGoalsRequest(q: string, limit?: number): Promise<GoalDto[]> {
  const { data } = await api.get<ApiEnvelope<GoalDto[]>>('/goals/search', { params: { q, limit } });
  return data.data;
}

export interface GoalStatisticsDto {
  progressPct: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  tasksCompleted: number;
  tasksOverdue: number;
  tasksRemaining: number;
  tasksTotal: number;
  habitContribution: number;
  daysElapsed: number;
  daysRemaining: number | null;
  onTrack: boolean | null;
}

export async function fetchGoalStatistics(id: string): Promise<GoalStatisticsDto> {
  const { data } = await api.get<ApiEnvelope<GoalStatisticsDto>>(`/goals/${id}/statistics`);
  return data.data;
}

export interface GoalsOverviewStatisticsDto {
  goalsCreated: number;
  goalsCompleted: number;
  completionRate: number;
  averageDurationDays: number | null;
  onTimePct: number;
  overduePct: number;
  mostProductiveGoal: { id: string; title: string; score: number } | null;
  longestRunningGoal: { id: string; title: string; days: number } | null;
  milestoneCompletionRate: number;
  taskCompletionRate: number;
  monthlyProgress: { month: string; averagePct: number }[];
}

export async function fetchGoalsOverviewStatistics(range?: { from?: string; to?: string }): Promise<GoalsOverviewStatisticsDto> {
  const { data } = await api.get<ApiEnvelope<GoalsOverviewStatisticsDto>>('/goals/statistics', { params: range });
  return data.data;
}

export interface GoalActivityDto {
  id: string;
  goalId: string;
  userId: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
}

export async function fetchGoalActivity(id: string): Promise<GoalActivityDto[]> {
  const { data } = await api.get<ApiEnvelope<GoalActivityDto[]>>(`/goals/${id}/activity`);
  return data.data;
}

export interface GoalTaskCounts {
  completed: number;
  overdue: number;
  remaining: number;
  total: number;
}

export interface GoalTaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

export interface GoalTasksResult {
  items: GoalTaskItem[];
  counts: GoalTaskCounts;
}

export async function fetchGoalTasks(id: string): Promise<GoalTasksResult> {
  const { data } = await api.get<ApiEnvelope<GoalTasksResult>>(`/goals/${id}/tasks`);
  return data.data;
}

export async function attachGoalTaskRequest(id: string, taskId: string): Promise<void> {
  await api.post(`/goals/${id}/tasks/attach`, { taskId });
}

export async function detachGoalTaskRequest(id: string, taskId: string): Promise<void> {
  await api.post(`/goals/${id}/tasks/detach`, { taskId });
}

export type GoalHabitContributionType = 'count' | 'value';

export interface GoalHabitLinkDto {
  id: string;
  goalId: string;
  habitId: string;
  contributionType: GoalHabitContributionType;
  contributionWeight: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchGoalHabits(id: string): Promise<GoalHabitLinkDto[]> {
  const { data } = await api.get<ApiEnvelope<GoalHabitLinkDto[]>>(`/goals/${id}/habits`);
  return data.data;
}

export async function linkGoalHabitRequest(
  id: string,
  input: { habitId: string; contributionType?: GoalHabitContributionType; contributionWeight?: number }
): Promise<GoalHabitLinkDto> {
  const { data } = await api.post<ApiEnvelope<GoalHabitLinkDto>>(`/goals/${id}/habits/link`, input);
  return data.data;
}

export async function updateGoalHabitLinkRequest(
  id: string,
  habitId: string,
  input: { contributionType?: GoalHabitContributionType; contributionWeight?: number }
): Promise<GoalHabitLinkDto> {
  const { data } = await api.patch<ApiEnvelope<GoalHabitLinkDto>>(`/goals/${id}/habits/${habitId}`, input);
  return data.data;
}

export async function unlinkGoalHabitRequest(id: string, habitId: string): Promise<void> {
  await api.delete(`/goals/${id}/habits/${habitId}`);
}

export interface StartGoalTimerResult {
  sessionId: string;
  activityId: string;
  startedAt: string;
  stoppedPreviousSessionId: string | null;
}

export async function startGoalTimerRequest(id: string, note?: string | null): Promise<StartGoalTimerResult> {
  const { data } = await api.post<ApiEnvelope<StartGoalTimerResult>>(`/goals/${id}/timer/start`, note ? { note } : undefined);
  return data.data;
}

export interface StopGoalTimerResult {
  sessionId: string;
  durationSeconds: number | null;
  totalTrackedSeconds: number;
}

export async function stopGoalTimerRequest(id: string, sessionId: string): Promise<StopGoalTimerResult> {
  const { data } = await api.post<ApiEnvelope<StopGoalTimerResult>>(`/goals/${id}/timer/stop`, { sessionId });
  return data.data;
}
