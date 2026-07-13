import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';
import type { ProductivityBand, ProductivityData } from '@/features/dashboard/types/dashboard';

const BAND_LABEL: Record<ProductivityBand, string> = {
  low: 'Getting started',
  building: 'Building momentum',
  strong: 'Strong day',
  peak: 'Peak performance',
};

function deltaLabel(delta: number): { text: string; className: string } {
  if (delta > 0) return { text: `▲ ${delta} vs last week`, className: 'text-success' };
  if (delta < 0) return { text: `▼ ${Math.abs(delta)} vs last week`, className: 'text-destructive' };
  return { text: 'Steady vs last week', className: 'text-muted-foreground' };
}

/** The signature productivity card: score ring, band, 7-day trend, and a per-component breakdown. */
export function ProductivityScoreCard({ productivity }: { productivity: ProductivityData }) {
  const delta = deltaLabel(productivity.weeklyDelta);

  return (
    <Card className="flex flex-col gap-5">
      <CardHeader className="pb-0">
        <CardTitle>Productivity</CardTitle>
      </CardHeader>

      <div className="flex items-center gap-5">
        <ProgressRing
          value={productivity.score}
          size={132}
          ariaLabel={`Productivity score ${productivity.score} out of 100`}
        >
          <span className="text-display leading-none text-foreground">{productivity.score}</span>
          <span className="text-caption text-muted-foreground">/ 100</span>
        </ProgressRing>

        <div className="flex flex-1 flex-col gap-2">
          <span className="text-label text-accent">{BAND_LABEL[productivity.band]}</span>
          <Sparkline
            data={productivity.trend}
            domain={[0, 100]}
            width={140}
            height={40}
            ariaLabel={`Score trend over the last 7 days, ending at ${productivity.score}`}
          />
          <span className={cn('text-small', delta.className)}>{delta.text}</span>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {productivity.breakdown.map((component) => {
          const pct = component.max > 0 ? Math.max(0, (component.points / component.max) * 100) : 0;
          return (
            <li key={component.label} className="flex items-center gap-3">
              <span className="w-24 text-small text-muted-foreground">{component.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-elevated">
                <span
                  className={cn(
                    'block h-full rounded-full',
                    component.points < 0 ? 'bg-destructive' : 'bg-accent'
                  )}
                  style={{ width: `${Math.min(100, Math.abs(pct))}%` }}
                />
              </span>
              <span className="w-12 text-right text-small tabular-nums text-foreground">
                {component.points}/{component.max}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
