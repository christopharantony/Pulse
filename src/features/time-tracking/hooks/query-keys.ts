/** Query-key factory for the Time Tracker page's data (mirrors `goalsKeys`). */
export const timeTrackingKeys = {
  all: ['time-tracking'] as const,
  running: () => ['time-tracking', 'running'] as const,
  today: () => ['time-tracking', 'today'] as const,
  history: (days: number) => ['time-tracking', 'history', days] as const,
  quickStart: () => ['time-tracking', 'quick-start'] as const,
};
