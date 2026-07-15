import { ProgressRing } from '@/components/ui/progress-ring';

interface GoalProgressRingProps {
  progressPct: number;
  size?: number;
  label?: string;
}

export function GoalProgressRing({ progressPct, size = 96, label }: GoalProgressRingProps) {
  return (
    <ProgressRing value={progressPct} size={size} strokeWidth={8} ariaLabel={`Progress ${progressPct} out of 100`}>
      <span className="text-h3 tabular-nums text-foreground">{progressPct}%</span>
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
    </ProgressRing>
  );
}
