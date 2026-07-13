import { CheckSquare, CheckCircle2, Flame, Repeat, Timer, AlertTriangle } from 'lucide-react';
import type { ComponentType } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import type { StatisticsData, StatKey } from '@/features/dashboard/types/dashboard';

const ICONS: Record<StatKey, ComponentType<{ className?: string }>> = {
  todaysTasks: CheckSquare,
  completedToday: CheckCircle2,
  habitsCompleted: Repeat,
  currentStreak: Flame,
  focusTimeToday: Timer,
  overdueTasks: AlertTriangle,
};

/** The KPI tile row, formatted from the overview statistics section. */
export function StatisticsGrid({ statistics }: { statistics: StatisticsData }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {statistics.cards.map((card) => {
        const Icon = ICONS[card.key];
        return (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.unit ? `${card.value} ${card.unit}` : card.value}
            icon={<Icon />}
            trend={card.trend}
          />
        );
      })}
    </div>
  );
}
