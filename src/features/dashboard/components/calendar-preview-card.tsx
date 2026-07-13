'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { MiniCalendar } from '@/components/ui/mini-calendar';
import { fetchDashboard } from '@/features/dashboard/api/dashboard.api';
import type { CalendarPreviewData } from '@/features/dashboard/types/dashboard';

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Mini month calendar with indicator dots. The initial month renders from the overview payload; when
 * the user navigates, a lightweight query fetches that month's calendar (reusing the overview
 * endpoint) so navigation works without a dedicated endpoint.
 */
export function CalendarPreviewCard({ calendar }: { calendar: CalendarPreviewData }) {
  const [month, setMonth] = useState(calendar.month);
  const isInitialMonth = month === calendar.month;

  const query = useQuery({
    queryKey: ['dashboard', 'calendar', month],
    queryFn: () => fetchDashboard(month),
    select: (data) => data.calendar,
    enabled: !isInitialMonth,
    staleTime: 60 * 1000,
  });

  const data = isInitialMonth ? calendar : (query.data ?? { month, days: [] });

  return (
    <Card>
      <MiniCalendar
        month={data.month}
        days={data.days}
        weekStartsOn={calendar.weekStartsOn}
        onPrev={() => setMonth((m) => shiftMonth(m, -1))}
        onNext={() => setMonth((m) => shiftMonth(m, 1))}
      />
    </Card>
  );
}
