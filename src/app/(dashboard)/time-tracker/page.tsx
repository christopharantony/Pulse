'use client';

import { Card } from '@/components/ui/card';
import { TimerControl } from '@/features/time-tracking/components/timer-control';
import { RecentActivities } from '@/features/time-tracking/components/recent-activities';
import { HistoryList } from '@/features/time-tracking/components/history-list';

export default function TimeTrackerPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className="flex flex-col gap-6">
        <TimerControl />
        <div className="flex flex-col gap-2 border-t border-border-subtle pt-6">
          <h2 className="text-label uppercase tracking-wide text-muted-foreground">Recent</h2>
          <RecentActivities />
        </div>
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="text-h3 text-foreground">Last 10 days</h2>
        <HistoryList />
      </Card>
    </div>
  );
}
