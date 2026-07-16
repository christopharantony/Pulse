import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';

export interface RunningSessionDto {
  sessionId: string;
  activityId: string;
  activityTitle: string;
  activityColor: string | null;
  sourceType: string;
  sourceId: string | null;
  startedAt: string;
}

export interface TodaySummaryDto {
  completedSeconds: number;
  runningStartedAt: string | null;
  sessionCount: number;
}

export interface HistoryDayDto {
  dayKey: string;
  totalSeconds: number;
  sessionCount: number;
}

export interface QuickStartActivityDto {
  id: string;
  title: string;
  color: string | null;
  sourceType: string;
  totalTrackedSeconds: number;
  lastTrackedAt: string | null;
}

export interface StartTimerResultDto {
  sessionId: string;
  activityId: string;
  startedAt: string;
  stoppedPreviousSessionId: string | null;
}

export interface StopTimerResultDto {
  sessionId: string;
  durationSeconds: number | null;
  totalTrackedSeconds: number;
}

export async function getRunningSessionRequest(): Promise<RunningSessionDto | null> {
  const { data } = await api.get<ApiEnvelope<RunningSessionDto | null>>('/time-tracking/running');
  return data.data;
}

export async function getTodaySummaryRequest(): Promise<TodaySummaryDto> {
  const { data } = await api.get<ApiEnvelope<TodaySummaryDto>>('/time-tracking/today');
  return data.data;
}

export async function getHistoryRequest(days = 10): Promise<HistoryDayDto[]> {
  const { data } = await api.get<ApiEnvelope<HistoryDayDto[]>>('/time-tracking/history', { params: { days } });
  return data.data;
}

export async function getQuickStartActivitiesRequest(): Promise<QuickStartActivityDto[]> {
  const { data } = await api.get<ApiEnvelope<QuickStartActivityDto[]>>('/time-tracking/quick-start');
  return data.data;
}

/** Start a timer against an existing activity (resume) or a brand-new ad-hoc one. */
export type StartTimerInput = { activityId: string; note?: string | null } | { title: string; note?: string | null };

export async function startTimerRequest(input: StartTimerInput): Promise<StartTimerResultDto> {
  const body = 'activityId' in input ? input : { sourceType: 'quick_focus' as const, title: input.title, note: input.note };
  const { data } = await api.post<ApiEnvelope<StartTimerResultDto>>('/time-tracking/start', body);
  return data.data;
}

export async function stopTimerRequest(sessionId: string, note?: string | null): Promise<StopTimerResultDto> {
  const { data } = await api.post<ApiEnvelope<StopTimerResultDto>>('/time-tracking/stop', { sessionId, note });
  return data.data;
}
