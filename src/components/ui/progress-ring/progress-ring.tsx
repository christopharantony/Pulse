import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  /** 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Accessible description of what the ring represents (e.g. "Productivity score 72 out of 100"). */
  ariaLabel: string;
  /** Center content (usually the numeric value + label). */
  children?: ReactNode;
  className?: string;
}

/**
 * A radial 0–100 progress ring built from two SVG circles — a track and an accent-colored arc drawn
 * with `stroke-dasharray`. The arc animates from empty via a `stroke-dashoffset` transition, which
 * is disabled under reduced-motion. Theming comes entirely from design tokens.
 */
export function ProgressRing({
  value,
  size = 160,
  strokeWidth = 12,
  ariaLabel,
  children,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-elevated"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-accent transition-[stroke-dashoffset] duration-slow ease-expo-out motion-reduce:transition-none"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
