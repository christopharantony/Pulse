import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { calendarRepository } from '@/features/calendar/repositories/calendar.repository';

describe('calendarRepository', () => {
  it('returns events overlapping a date range, ordered by start', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();

    await calendarRepository.create(workspaceId, createdBy, {
      title: 'Standup',
      startsAt: new Date('2026-06-01T09:00:00.000Z'),
      endsAt: new Date('2026-06-01T09:15:00.000Z'),
    });
    await calendarRepository.create(workspaceId, createdBy, {
      title: 'Review',
      startsAt: new Date('2026-06-01T14:00:00.000Z'),
      endsAt: new Date('2026-06-01T15:00:00.000Z'),
    });
    // Outside the queried window.
    await calendarRepository.create(workspaceId, createdBy, {
      title: 'Next week',
      startsAt: new Date('2026-06-08T09:00:00.000Z'),
      endsAt: new Date('2026-06-08T10:00:00.000Z'),
    });

    const dayEvents = await calendarRepository.listByRange(
      workspaceId,
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-01T23:59:59.000Z')
    );
    expect(dayEvents.map((e) => e.title)).toEqual(['Standup', 'Review']);
  });

  it('scopes events by workspace', async () => {
    await calendarRepository.create(new ObjectId(), new ObjectId(), {
      title: 'Theirs',
      startsAt: new Date('2026-06-01T09:00:00.000Z'),
      endsAt: new Date('2026-06-01T10:00:00.000Z'),
    });
    const mine = await calendarRepository.listByRange(
      new ObjectId(),
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-02T00:00:00.000Z')
    );
    expect(mine).toHaveLength(0);
  });
});
