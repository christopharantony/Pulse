import { api } from '@/lib/axios';
import type { ApiEnvelope, SessionDto } from '@/features/auth/types';

export async function fetchSessionsRequest(): Promise<SessionDto[]> {
  const { data } = await api.get<ApiEnvelope<SessionDto[]>>('/auth/sessions');
  return data.data;
}

export async function revokeSessionRequest(id: string): Promise<void> {
  await api.delete(`/auth/sessions/${id}`);
}

export async function revokeOtherSessionsRequest(): Promise<void> {
  await api.post('/auth/sessions/revoke-others');
}

export async function logoutAllDevicesRequest(): Promise<void> {
  await api.post('/auth/logout-all');
}
