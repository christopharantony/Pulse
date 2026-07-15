/**
 * Dashboard API contracts — the serialized (JSON-safe) shapes the BFF returns and the client
 * consumes. All ids and dates are strings here (never `ObjectId`/`Date`), because these cross the
 * HTTP boundary. Aggregators map domain documents into these shapes; the client mirrors them.
 */
import type { TaskPriority, TaskStatus } from '@/features/tasks/types/task';
import type { HabitType } from '@/features/habits/types/habit';
import type { GoalCategory, GoalPriority, GoalStatus } from '@/features/goals/types/goal';

export type StatKey =
  | 'todaysTasks'
  | 'completedToday'
  | 'habitsCompleted'
  | 'currentStreak'
  | 'focusTimeToday'
  | 'overdueTasks';

export interface StatCardData {
  key: StatKey;
  label: string;
  value: number | string;
  unit?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string };
}

export interface StatisticsData {
  cards: StatCardData[];
}

export interface GreetingData {
  name: string;
  greeting: 'morning' | 'afternoon' | 'evening';
  message: string;
  dateISO: string;
  timezone: string;
  /** Reserved for the future weather feature — always null today. */
  weather: null;
}

export type ProductivityBand = 'low' | 'building' | 'strong' | 'peak';

export interface ProductivityComponent {
  label: string;
  points: number;
  max: number;
}

export interface ProductivityData {
  score: number;
  band: ProductivityBand;
  breakdown: ProductivityComponent[];
  /** Last 7 daily scores, oldest → newest, for the sparkline. */
  trend: number[];
  weeklyDelta: number;
  monthlyDelta: number;
  productiveDayStreak: number;
}

export interface RecentTaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: { id: string; name: string; color: string | null } | null;
  dueDate: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface RecentTasksData {
  items: RecentTaskItem[];
  /** Offset to request the next page, or null when the last page was reached. */
  nextOffset: number | null;
  total: number;
}

export interface HabitTodayItem {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  type: HabitType;
  unit: string | null;
  frequencyLabel: string;
  currentStreak: number;
  completionPct: number;
  /** 0-100 progress toward TODAY's target specifically (vs `completionPct`, a period measure). */
  progressToday: number;
  completedToday: boolean;
  nextReminder: string | null;
}

export interface HabitSummaryData {
  items: HabitTodayItem[];
  completedCount: number;
  totalCount: number;
}

export interface CalendarIndicator {
  type: 'task' | 'habit' | 'event' | 'milestone';
  count: number;
  color: string;
}

export interface CalendarDay {
  dateISO: string;
  isToday: boolean;
  inMonth: boolean;
  indicators: CalendarIndicator[];
}

export interface CalendarPreviewData {
  /** `YYYY-MM` of the displayed month. */
  month: string;
  /** 0=Sunday..6=Saturday — so the client renders weekday headers in the workspace's order. */
  weekStartsOn: number;
  days: CalendarDay[];
}

export interface GoalSummaryItem {
  id: string;
  title: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  progressPct: number;
  targetDate: string | null;
  color: string | null;
  icon: string | null;
  updatedAt: string;
}

export interface UpcomingMilestoneItem {
  id: string;
  goalId: string;
  goalTitle: string;
  title: string;
  dueDate: string | null;
}

export interface GoalsSummaryData {
  activeCount: number;
  completedCount: number;
  /** 0-100 average progress across active (non-completed/cancelled/archived) goals. */
  averageProgressPct: number;
  upcomingMilestones: UpcomingMilestoneItem[];
  goalDeadlines: GoalSummaryItem[];
  recentlyUpdated: GoalSummaryItem[];
  atRisk: GoalSummaryItem[];
}

export interface DashboardOverview {
  greeting: GreetingData;
  statistics: StatisticsData;
  productivity: ProductivityData;
  recentTasks: RecentTasksData;
  habits: HabitSummaryData;
  goals: GoalsSummaryData;
  calendar: CalendarPreviewData;
  generatedAt: string;
}
