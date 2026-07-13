import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { analyticsRepository } from '@/features/analytics/repositories/analytics.repository';
import { utcDate } from '@/test/helpers';

const zeroMetrics = {
  trackedSeconds: 0,
  tasksCompleted: 0,
  habitsCompleted: 0,
  focusSessions: 0,
};

describe('analyticsRepository', () => {
  it('upserts a rollup idempotently per user/day', async () => {
    const workspaceId = new ObjectId();
    const userId = new ObjectId();
    const date = utcDate('2026-07-01');

    const first = await analyticsRepository.upsertForDay({
      workspaceId,
      userId,
      date,
      metrics: { ...zeroMetrics, tasksCompleted: 3 },
    });
    const second = await analyticsRepository.upsertForDay({
      workspaceId,
      userId,
      date,
      metrics: { ...zeroMetrics, tasksCompleted: 5, trackedSeconds: 3600 },
    });

    // Same row, overwritten metrics — the rollup job can safely re-run a day.
    expect(second._id.toHexString()).toBe(first._id.toHexString());
    expect(second.metrics.tasksCompleted).toBe(5);
    expect(second.metrics.trackedSeconds).toBe(3600);
  });

  it('lists rollups within a date range', async () => {
    const workspaceId = new ObjectId();
    const userId = new ObjectId();
    for (const day of ['2026-07-01', '2026-07-02', '2026-07-15']) {
      await analyticsRepository.upsertForDay({
        workspaceId,
        userId,
        date: utcDate(day),
        metrics: zeroMetrics,
      });
    }

    const firstWeek = await analyticsRepository.listForRange(
      workspaceId,
      userId,
      utcDate('2026-07-01'),
      utcDate('2026-07-07')
    );
    expect(firstWeek).toHaveLength(2);
    // Oldest-first ordering.
    expect(firstWeek[0].date.getTime()).toBeLessThan(firstWeek[1].date.getTime());
  });
});
