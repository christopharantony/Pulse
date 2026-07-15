'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Flame, Target, TrendingUp, Trophy } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/feedback/skeleton';
import { useHabitStatistics } from '@/features/habits/hooks/use-habit-statistics';
import { useHabitCalendar } from '@/features/habits/hooks/use-habit-calendar';
import type { HabitCalendarDayDto } from '@/features/habits/types/habit-dto';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** A rolling 7-day completion-rate series (0-100), the "Rolling Average / Trend" chart. */
function buildRollingSeries(days: HabitCalendarDayDto[]): { date: string; rate: number }[] {
  const scheduledStates = new Set(['completed', 'partial', 'skipped', 'missed', 'pending']);
  const relevant = days.filter((d) => d.state && scheduledStates.has(d.state));
  const satisfiedFlags: number[] = relevant.map((d) => (d.state === 'completed' ? 1 : 0));

  return relevant.map((day, i) => {
    const windowStart = Math.max(0, i - 6);
    const window = satisfiedFlags.slice(windowStart, i + 1);
    const rate = Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 100);
    return { date: day.dateISO.slice(5), rate };
  });
}

export function HabitStatisticsCharts({ habitId }: { habitId: string }) {
  const { data: stats, isLoading: statsLoading } = useHabitStatistics(habitId);
  const from = isoDaysAgo(90);
  const to = isoDaysAgo(0);
  const { data: calendar, isLoading: calendarLoading } = useHabitCalendar(habitId, from, to);

  const series = useMemo(() => buildRollingSeries(calendar?.days ?? []), [calendar]);

  if (statsLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Current streak" value={`${stats.currentStreak}${stats.streakUnit === 'period' ? 'w' : 'd'}`} icon={<Flame />} />
        <StatCard label="Longest streak" value={`${stats.longestStreak}${stats.streakUnit === 'period' ? 'w' : 'd'}`} icon={<Trophy />} />
        <StatCard label="This week" value={`${stats.weeklyScore}%`} icon={<Target />} />
        <StatCard label="Consistency" value={`${stats.consistencyScore}%`} icon={<TrendingUp />} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today" value={`${stats.todayScore}%`} />
        <StatCard label="This month" value={`${stats.monthlyScore}%`} />
        <StatCard label="Completion rate" value={`${stats.completionRate}%`} />
        <StatCard
          label="Total"
          value={
            stats.totalMinutes != null
              ? `${stats.totalMinutes} min`
              : stats.totalQuantity != null
                ? stats.totalQuantity
                : stats.totalCompletions
          }
        />
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface/40 p-4">
        <p className="mb-3 text-label text-muted-foreground">Rolling 7-day completion rate</p>
        {calendarLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : series.length === 0 ? (
          <p className="text-caption text-muted-foreground">Not enough history yet.</p>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="habitTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border-subtle" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    background: 'rgb(var(--color-surface-elevated))',
                    border: '1px solid rgb(var(--color-border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}%`, 'Completion']}
                />
                <Area type="monotone" dataKey="rate" stroke="rgb(var(--color-accent))" strokeWidth={2} fill="url(#habitTrendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {(stats.bestWeek || stats.bestMonth) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.bestWeek && (
            <StatCard label="Best week" value={stats.bestWeek.satisfiedCount} />
          )}
          {stats.bestMonth && (
            <StatCard label="Best month" value={`${stats.bestMonth.completionPct}%`} />
          )}
        </div>
      )}
    </div>
  );
}
