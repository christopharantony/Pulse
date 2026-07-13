import { api } from '@/lib/axios';
import type { ApiEnvelope } from '@/features/auth/types';
import type { TaskDetailDto, TaskListItemDto } from '@/features/tasks/types/task-dto';

export interface TaskListQuery {
  status?: string[];
  priority?: string[];
  tagIds?: string[];
  projectId?: string;
  q?: string;
  dueFrom?: string;
  dueTo?: string;
  hasDueDate?: boolean;
  hasSubtasks?: boolean;
  isRecurring?: boolean;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TaskListResult {
  items: TaskListItemDto[];
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

export interface SubtaskInputDto {
  title: string;
  completed?: boolean;
  order?: number;
  children?: SubtaskInputDto[];
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  notes?: string | null;
  projectId?: string | null;
  status?: TaskListItemDto['status'];
  priority?: TaskListItemDto['priority'];
  color?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  dueHasTime?: boolean;
  estimatedMinutes?: number | null;
  recurrence?: RecurrenceInput | null;
  reminders?: { offsetMinutes: number }[];
  tagIds?: string[];
  subtasks?: SubtaskInputDto[];
  assigneeId?: string | null;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

function buildListParams(query: TaskListQuery): Record<string, unknown> {
  const params: Record<string, unknown> = { ...query };
  return params;
}

export async function fetchTasks(query: TaskListQuery = {}): Promise<TaskListResult> {
  const { data } = await api.get<ApiEnvelope<TaskListResult>>('/tasks', {
    params: buildListParams(query),
    paramsSerializer: { indexes: null },
  });
  return data.data;
}

export async function fetchTask(id: string): Promise<TaskDetailDto> {
  const { data } = await api.get<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}`);
  return data.data;
}

export async function createTaskRequest(input: CreateTaskInput): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>('/tasks', input);
  return data.data;
}

export async function updateTaskRequest(id: string, input: UpdateTaskInput): Promise<TaskDetailDto> {
  const { data } = await api.patch<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}`, input);
  return data.data;
}

export async function deleteTaskRequest(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

export async function duplicateTaskRequest(id: string, title?: string): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}/duplicate`, title ? { title } : undefined);
  return data.data;
}

export async function restoreTaskRequest(id: string): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}/restore`);
  return data.data;
}

export async function permanentDeleteTaskRequest(id: string): Promise<void> {
  await api.delete(`/tasks/${id}/permanent`);
}

export async function archiveTaskRequest(id: string): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}/archive`);
  return data.data;
}

export async function unarchiveTaskRequest(id: string, status?: string): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}/unarchive`, status ? { status } : undefined);
  return data.data;
}

export async function completeTaskRequest(id: string): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}/complete`);
  return data.data;
}

export async function moveTaskRequest(id: string, status: string, order: number): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}/move`, { status, order });
  return data.data;
}

export async function reorderTaskRequest(id: string, order: number): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${id}/reorder`, { order });
  return data.data;
}

export async function fetchTrash(): Promise<TaskListItemDto[]> {
  const { data } = await api.get<ApiEnvelope<TaskListItemDto[]>>('/tasks/trash');
  return data.data;
}

export async function searchTasksRequest(q: string, limit?: number): Promise<TaskListItemDto[]> {
  const { data } = await api.get<ApiEnvelope<TaskListItemDto[]>>('/tasks/search', { params: { q, limit } });
  return data.data;
}

export async function bulkUpdateTasksRequest(
  ids: string[],
  patch: { status?: string; priority?: string; projectId?: string | null; tagIds?: string[] }
): Promise<{ modified: number }> {
  const { data } = await api.patch<ApiEnvelope<{ modified: number }>>('/tasks/bulk', { ids, patch });
  return data.data;
}

export async function bulkDeleteTasksRequest(ids: string[]): Promise<{ modified: number }> {
  const { data } = await api.delete<ApiEnvelope<{ modified: number }>>('/tasks/bulk', { data: { ids } });
  return data.data;
}

export async function bulkArchiveTasksRequest(ids: string[]): Promise<{ modified: number }> {
  const { data } = await api.post<ApiEnvelope<{ modified: number }>>('/tasks/bulk/archive', { ids });
  return data.data;
}

export async function addSubtaskRequest(taskId: string, title: string, parentSubtaskId?: string | null): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${taskId}/subtasks`, { title, parentSubtaskId });
  return data.data;
}

export async function updateSubtaskRequest(
  taskId: string,
  subtaskId: string,
  patch: { title?: string; completed?: boolean; order?: number }
): Promise<TaskDetailDto> {
  const { data } = await api.patch<ApiEnvelope<TaskDetailDto>>(`/tasks/${taskId}/subtasks/${subtaskId}`, patch);
  return data.data;
}

export async function removeSubtaskRequest(taskId: string, subtaskId: string): Promise<TaskDetailDto> {
  const { data } = await api.delete<ApiEnvelope<TaskDetailDto>>(`/tasks/${taskId}/subtasks/${subtaskId}`);
  return data.data;
}

export async function reorderSubtasksRequest(
  taskId: string,
  orderedIds: string[],
  parentSubtaskId?: string | null
): Promise<TaskDetailDto> {
  const { data } = await api.post<ApiEnvelope<TaskDetailDto>>(`/tasks/${taskId}/subtasks/reorder`, {
    orderedIds,
    parentSubtaskId,
  });
  return data.data;
}
