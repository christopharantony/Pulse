import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';
import type {
  HabitCalendarDto,
  HabitDto,
  HabitStatisticsDto,
} from '@/features/habits/types/habit-dto';

export interface HabitListQuery {
  type?: string[];
  category?: string[];
  q?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface HabitListResult {
  items: HabitDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RecurrenceInput {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string | null;
  completionBehavior?: 'fixed' | 'rolling';
}

export interface HabitChecklistItemInput {
  id: string;
  name: string;
  order: number;
}

export interface HabitReminderInput {
  timeOfDay: string;
  enabled?: boolean;
}

export interface CreateHabitInput {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  category?: string | null;
  type: 'boolean' | 'numeric' | 'duration' | 'checklist';
  recurrence: RecurrenceInput;
  specificDates?: string[] | null;
  startDate?: string | null;
  endDate?: string | null;
  targetPerPeriod?: number | null;
  targetValue?: number | null;
  unit?: string | null;
  checklistItems?: HabitChecklistItemInput[] | null;
  reminders?: HabitReminderInput[];
}

export type UpdateHabitInput = Partial<Omit<CreateHabitInput, 'type'>>;

export interface LogHabitInput {
  date?: string;
  status?: 'completed' | 'skipped' | 'partial' | 'missed';
  value?: number;
  deltaValue?: number;
  checkedItemIds?: string[];
}

function buildListParams(query: HabitListQuery): Record<string, unknown> {
  return { ...query };
}

export async function fetchHabits(query: HabitListQuery = {}): Promise<HabitListResult> {
  const { data } = await api.get<ApiEnvelope<HabitListResult>>('/habits', {
    params: buildListParams(query),
    paramsSerializer: { indexes: null },
  });
  return data.data;
}

export async function fetchHabit(id: string): Promise<HabitDto> {
  const { data } = await api.get<ApiEnvelope<HabitDto>>(`/habits/${id}`);
  return data.data;
}

export async function createHabitRequest(input: CreateHabitInput): Promise<HabitDto> {
  const { data } = await api.post<ApiEnvelope<HabitDto>>('/habits', input);
  return data.data;
}

export async function updateHabitRequest(id: string, input: UpdateHabitInput): Promise<HabitDto> {
  const { data } = await api.patch<ApiEnvelope<HabitDto>>(`/habits/${id}`, input);
  return data.data;
}

export async function deleteHabitRequest(id: string): Promise<void> {
  await api.delete(`/habits/${id}`);
}

export async function restoreHabitRequest(id: string): Promise<HabitDto> {
  const { data } = await api.post<ApiEnvelope<HabitDto>>(`/habits/${id}/restore`);
  return data.data;
}

export async function permanentDeleteHabitRequest(id: string): Promise<void> {
  await api.delete(`/habits/${id}/permanent`);
}

export async function archiveHabitRequest(id: string): Promise<HabitDto> {
  const { data } = await api.post<ApiEnvelope<HabitDto>>(`/habits/${id}/archive`);
  return data.data;
}

export async function unarchiveHabitRequest(id: string): Promise<HabitDto> {
  const { data } = await api.post<ApiEnvelope<HabitDto>>(`/habits/${id}/unarchive`);
  return data.data;
}

export async function completeHabitRequest(id: string): Promise<HabitDto> {
  const { data } = await api.post<ApiEnvelope<HabitDto>>(`/habits/${id}/complete`);
  return data.data;
}

export async function logHabitRequest(id: string, input: LogHabitInput): Promise<HabitDto> {
  const { data } = await api.post<ApiEnvelope<HabitDto>>(`/habits/${id}/log`, input);
  return data.data;
}

export async function undoHabitLogRequest(id: string, date?: string): Promise<HabitDto> {
  const { data } = await api.delete<ApiEnvelope<HabitDto>>(`/habits/${id}/log`, {
    params: date ? { date } : undefined,
  });
  return data.data;
}

export async function fetchHabitCalendar(id: string, from: string, to: string): Promise<HabitCalendarDto> {
  const { data } = await api.get<ApiEnvelope<HabitCalendarDto>>(`/habits/${id}/calendar`, {
    params: { from, to },
  });
  return data.data;
}

export async function fetchHabitStatistics(id: string): Promise<HabitStatisticsDto> {
  const { data } = await api.get<ApiEnvelope<HabitStatisticsDto>>(`/habits/${id}/statistics`);
  return data.data;
}

export interface StartHabitTimerResult {
  sessionId: string;
  activityId: string;
  startedAt: string;
  stoppedPreviousSessionId: string | null;
}

export async function startHabitTimerRequest(id: string, note?: string | null): Promise<StartHabitTimerResult> {
  const { data } = await api.post<ApiEnvelope<StartHabitTimerResult>>(`/habits/${id}/timer/start`, note ? { note } : undefined);
  return data.data;
}

export interface StopHabitTimerResult {
  sessionId: string;
  durationSeconds: number | null;
  totalTrackedSeconds: number;
  habit: HabitDto;
}

export async function stopHabitTimerRequest(id: string, sessionId: string): Promise<StopHabitTimerResult> {
  const { data } = await api.post<ApiEnvelope<StopHabitTimerResult>>(`/habits/${id}/timer/stop`, { sessionId });
  return data.data;
}

export async function fetchHabitTrash(): Promise<HabitDto[]> {
  const { data } = await api.get<ApiEnvelope<HabitDto[]>>('/habits/trash');
  return data.data;
}

export async function searchHabitsRequest(q: string, limit?: number): Promise<HabitDto[]> {
  const { data } = await api.get<ApiEnvelope<HabitDto[]>>('/habits/search', { params: { q, limit } });
  return data.data;
}
