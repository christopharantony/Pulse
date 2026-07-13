import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';

export interface TaskCommentDto {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchComments(taskId: string): Promise<TaskCommentDto[]> {
  const { data } = await api.get<ApiEnvelope<TaskCommentDto[]>>(`/tasks/${taskId}/comments`);
  return data.data;
}

export async function addCommentRequest(taskId: string, body: string): Promise<TaskCommentDto> {
  const { data } = await api.post<ApiEnvelope<TaskCommentDto>>(`/tasks/${taskId}/comments`, { body });
  return data.data;
}

export async function deleteCommentRequest(taskId: string, commentId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}/comments/${commentId}`);
}
