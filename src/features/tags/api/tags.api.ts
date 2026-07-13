import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';

export interface TagDto {
  id: string;
  name: string;
  color: string | null;
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
}

export type UpdateTagInput = Partial<CreateTagInput>;

export async function fetchTags(): Promise<TagDto[]> {
  const { data } = await api.get<ApiEnvelope<TagDto[]>>('/tags');
  return data.data;
}

export async function createTagRequest(input: CreateTagInput): Promise<TagDto> {
  const { data } = await api.post<ApiEnvelope<TagDto>>('/tags', input);
  return data.data;
}

export async function updateTagRequest(id: string, input: UpdateTagInput): Promise<TagDto> {
  const { data } = await api.patch<ApiEnvelope<TagDto>>(`/tags/${id}`, input);
  return data.data;
}

export async function deleteTagRequest(id: string): Promise<void> {
  await api.delete(`/tags/${id}`);
}
