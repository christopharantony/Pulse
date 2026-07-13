import type { ProductivityBand, ProductivityComponent } from '@/features/dashboard/types/dashboard';

/**
 * Productivity score — a weighted, normalized, ratio-based 0–100 daily score (Phase 6 design §11).
 *
 * `computeDailyScore` is a pure function so it is trivially unit-testable and reused identically by
 * the live "today" read path and the nightly rollup job — the number can never disagree between the
 * two. Every component is a 0–1 signal times a fixed weight; ratios + hard caps make the score
 * reflect balanced effort relative to the user's own pattern rather than raw volume, so it resists
 * gaming.
 */

export interface ScoreInputs {
  tasksCompleted: number;
  /** Personalized rolling target (median of recent completed-task counts); floored at 1. */
  dailyTaskTarget: number;
  habitsCompletedToday: number;
  habitsScheduledToday: number;
  focusMinutes: number;
  focusGoalMinutes: number;
  overdueTasks: number;
  productiveDayStreak: number;
  longestActiveHabitStreak: number;
}

export interface ScoreResult {
  score: number;
  band: ProductivityBand;
  breakdown: ProductivityComponent[];
}

/** Component weights sum to 100 on the positive side; overdue is a penalty applied on top. */
const WEIGHTS = {
  tasks: 30,
  habits: 25,
  focus: 20,
  overdue: 15, // magnitude of the penalty
  consistency: 15,
  streak: 10,
} as const;

const OVERDUE_TOLERANCE = 5;
const CONSISTENCY_WINDOW_DAYS = 7;
const STREAK_TARGET_DAYS = 30;

/** A day counts as "productive" at/above this score — the `building` band floor. */
export const PRODUCTIVE_DAY_THRESHOLD = 40;

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 1 ? 1 : n;
}

export function scoreBand(score: number): ProductivityBand {
  if (score >= 85) return 'peak';
  if (score >= 65) return 'strong';
  if (score >= 40) return 'building';
  return 'low';
}

export function computeDailyScore(inputs: ScoreInputs): ScoreResult {
  const taskSignal = clamp01(inputs.tasksCompleted / Math.max(1, inputs.dailyTaskTarget));
  const habitSignal =
    inputs.habitsScheduledToday <= 0
      ? 1
      : clamp01(inputs.habitsCompletedToday / inputs.habitsScheduledToday);
  const focusSignal = clamp01(inputs.focusMinutes / Math.max(1, inputs.focusGoalMinutes));
  const overdueSignal = clamp01(inputs.overdueTasks / OVERDUE_TOLERANCE);
  const consistencySignal = clamp01(inputs.productiveDayStreak / CONSISTENCY_WINDOW_DAYS);
  const streakSignal = clamp01(inputs.longestActiveHabitStreak / STREAK_TARGET_DAYS);

  const taskPoints = taskSignal * WEIGHTS.tasks;
  const habitPoints = habitSignal * WEIGHTS.habits;
  const focusPoints = focusSignal * WEIGHTS.focus;
  const overduePoints = -overdueSignal * WEIGHTS.overdue;
  const consistencyPoints = consistencySignal * WEIGHTS.consistency;
  const streakPoints = streakSignal * WEIGHTS.streak;

  const raw =
    taskPoints + habitPoints + focusPoints + overduePoints + consistencyPoints + streakPoints;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const breakdown: ProductivityComponent[] = [
    { label: 'Tasks', points: Math.round(taskPoints), max: WEIGHTS.tasks },
    { label: 'Habits', points: Math.round(habitPoints), max: WEIGHTS.habits },
    { label: 'Focus', points: Math.round(focusPoints), max: WEIGHTS.focus },
    { label: 'Consistency', points: Math.round(consistencyPoints), max: WEIGHTS.consistency },
    { label: 'Streak', points: Math.round(streakPoints), max: WEIGHTS.streak },
    { label: 'Overdue', points: Math.round(overduePoints), max: WEIGHTS.overdue },
  ];

  return { score, band: scoreBand(score), breakdown };
}

/** Median of a numeric list (0 for empty). Used to personalize the daily task target. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
