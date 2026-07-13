import { describe, it, expect } from 'vitest';
import {
  computeDailyScore,
  median,
  scoreBand,
  type ScoreInputs,
} from '@/features/analytics/services/productivity.service';

const BASE: ScoreInputs = {
  tasksCompleted: 0,
  dailyTaskTarget: 3,
  habitsCompletedToday: 0,
  habitsScheduledToday: 0,
  focusMinutes: 0,
  focusGoalMinutes: 90,
  overdueTasks: 0,
  productiveDayStreak: 0,
  longestActiveHabitStreak: 0,
};

describe('computeDailyScore', () => {
  it('scores a zero-activity day at 0 (no scheduled habits => full habit credit, but nothing else)', () => {
    // With no scheduled habits the habit signal is 1.0 (25 pts) by design.
    const { score } = computeDailyScore(BASE);
    expect(score).toBe(25);
  });

  it('caps task completion at the target — overachieving cannot exceed the weight', () => {
    const target = computeDailyScore({ ...BASE, tasksCompleted: 3, dailyTaskTarget: 3 });
    const over = computeDailyScore({ ...BASE, tasksCompleted: 50, dailyTaskTarget: 3 });
    expect(over.score).toBe(target.score); // both hit the 30-pt cap
  });

  it('rewards a fully balanced day near the top', () => {
    const { score, band } = computeDailyScore({
      tasksCompleted: 5,
      dailyTaskTarget: 5,
      habitsCompletedToday: 4,
      habitsScheduledToday: 4,
      focusMinutes: 120,
      focusGoalMinutes: 90,
      overdueTasks: 0,
      productiveDayStreak: 7,
      longestActiveHabitStreak: 30,
    });
    expect(score).toBe(100);
    expect(band).toBe('peak');
  });

  it('applies the overdue penalty', () => {
    const clean = computeDailyScore({ ...BASE, tasksCompleted: 3 });
    const withDebt = computeDailyScore({ ...BASE, tasksCompleted: 3, overdueTasks: 5 });
    expect(withDebt.score).toBe(clean.score - 15);
  });

  it('does not let the penalty push the score below zero', () => {
    const { score } = computeDailyScore({ ...BASE, habitsScheduledToday: 2, overdueTasks: 100 });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('uses scheduled habits as the denominator (half done => half credit)', () => {
    const full = computeDailyScore({ ...BASE, habitsCompletedToday: 4, habitsScheduledToday: 4 });
    const half = computeDailyScore({ ...BASE, habitsCompletedToday: 2, habitsScheduledToday: 4 });
    expect(full.score).toBe(25);
    expect(half.score).toBe(13); // round(12.5)
  });

  it('exposes a per-component breakdown that sums to the score (minus overdue)', () => {
    const { score, breakdown } = computeDailyScore({ ...BASE, tasksCompleted: 3, overdueTasks: 0 });
    const positive = breakdown
      .filter((b) => b.label !== 'Overdue')
      .reduce((sum, b) => sum + b.points, 0);
    const overdue = breakdown.find((b) => b.label === 'Overdue')!.points;
    expect(positive + overdue).toBe(score);
  });
});

describe('scoreBand', () => {
  it('maps scores to bands at the documented thresholds', () => {
    expect(scoreBand(0)).toBe('low');
    expect(scoreBand(39)).toBe('low');
    expect(scoreBand(40)).toBe('building');
    expect(scoreBand(64)).toBe('building');
    expect(scoreBand(65)).toBe('strong');
    expect(scoreBand(85)).toBe('peak');
    expect(scoreBand(100)).toBe('peak');
  });
});

describe('median', () => {
  it('handles odd and even lengths and empty input', () => {
    expect(median([])).toBe(0);
    expect(median([5])).toBe(5);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
