import type { GoalCategory, GoalPriority, GoalProgressMethod, GoalStatus, GoalVisibility } from '@/features/goals/types/goal';

/**
 * Goal API contract — the serialized (JSON-safe) shape routes return and the client consumes.
 * All ids and dates are strings here, never `ObjectId`/`Date`, mirroring Habit/Task's domain-vs-DTO split.
 */
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
  /** 0-100, derived from `currentValue`/`targetValue` for the manual/habit methods; other methods overwrite `currentValue` directly. */
  progressPct: number;
  visibility: GoalVisibility;
  tagIds: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListGoalsResult {
  items: GoalDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
