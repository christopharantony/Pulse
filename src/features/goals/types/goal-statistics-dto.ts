export interface GoalStatisticsDto {
  progressPct: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  tasksCompleted: number;
  tasksOverdue: number;
  tasksRemaining: number;
  tasksTotal: number;
  habitContribution: number;
  daysElapsed: number;
  /** null when the goal has no `targetDate`. */
  daysRemaining: number | null;
  /** null when there isn't enough date information (`startDate`+`targetDate`) to project a pace. */
  onTrack: boolean | null;
}

export interface GoalRefStatDto {
  id: string;
  title: string;
}

export interface GoalsOverviewStatisticsDto {
  goalsCreated: number;
  goalsCompleted: number;
  completionRate: number;
  averageDurationDays: number | null;
  onTimePct: number;
  overduePct: number;
  mostProductiveGoal: (GoalRefStatDto & { score: number }) | null;
  longestRunningGoal: (GoalRefStatDto & { days: number }) | null;
  milestoneCompletionRate: number;
  taskCompletionRate: number;
  /** Monthly-bucketed average progress %, oldest first. */
  monthlyProgress: { month: string; averagePct: number }[];
}
