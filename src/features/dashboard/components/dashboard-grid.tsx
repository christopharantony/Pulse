import type { DashboardOverview } from '@/features/dashboard/types/dashboard';
import { GreetingCard } from '@/features/dashboard/components/greeting-card';
import { StatisticsGrid } from '@/features/dashboard/components/statistics-grid';
import { ProductivityScoreCard } from '@/features/dashboard/components/productivity-score-card';
import { RecentTasksCard } from '@/features/dashboard/components/recent-tasks-card';
import { TodaysHabitsCard } from '@/features/dashboard/components/todays-habits-card';
import { CalendarPreviewCard } from '@/features/dashboard/components/calendar-preview-card';
import { QuickActionsCard } from '@/features/dashboard/components/quick-actions-card';

/**
 * The dashboard layout. Mobile is a single priority-ordered column (greeting → score → habits →
 * tasks → quick actions → calendar); on large screens it becomes a two-column layout with the
 * actionable lists on the left and the at-a-glance cards on the right.
 */
export function DashboardGrid({ overview }: { overview: DashboardOverview }) {
  return (
    <div className="flex flex-col gap-6">
      <GreetingCard greeting={overview.greeting} />
      <StatisticsGrid statistics={overview.statistics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: the actionable lists. */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <RecentTasksCard initial={overview.recentTasks} />
          <TodaysHabitsCard habits={overview.habits} />
        </div>

        {/* Right: at-a-glance cards. */}
        <div className="flex flex-col gap-6">
          <ProductivityScoreCard productivity={overview.productivity} />
          <CalendarPreviewCard calendar={overview.calendar} />
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
}
