/**
 * Dashboard API contracts — the serialized (JSON-safe) shapes the BFF returns and the client
 * consumes. All ids and dates are strings here (never `ObjectId`/`Date`), because these cross the
 * HTTP boundary. Aggregators map domain documents into these shapes; the client mirrors them.
 */

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
  status: 'todo' | 'in_progress' | 'done';
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
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
  frequencyLabel: string;
  currentStreak: number;
  completionPct: number;
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

export interface DashboardOverview {
  greeting: GreetingData;
  statistics: StatisticsData;
  productivity: ProductivityData;
  recentTasks: RecentTasksData;
  habits: HabitSummaryData;
  calendar: CalendarPreviewData;
  generatedAt: string;
}
