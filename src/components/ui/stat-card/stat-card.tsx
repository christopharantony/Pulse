import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  className?: string;
}

const trendColor = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
} as const;

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-label text-muted-foreground">{label}</p>
        {icon && <span className="text-accent [&_svg]:size-[18px]">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-h2 text-foreground">{value}</p>
        {trend && <span className={cn('text-small font-medium', trendColor[trend.direction])}>{trend.value}</span>}
      </div>
    </Card>
  );
}
