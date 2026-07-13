/** Query-key factory for dashboard data (mirrors `authKeys`). */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (month?: string) => ['dashboard', 'overview', month ?? 'current'] as const,
  overviewRoot: ['dashboard', 'overview'] as const,
};
