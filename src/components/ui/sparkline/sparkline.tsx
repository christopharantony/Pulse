import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Series values; rendered left → right. */
  data: number[];
  width?: number;
  height?: number;
  /** Fixed value domain; defaults to the data's own min/max. Pass [0,100] for scores. */
  domain?: [number, number];
  ariaLabel: string;
  className?: string;
}

/**
 * A minimal SVG trend line with a soft area fill — no charting dependency. Points are normalized
 * into the given (or data-derived) domain and drawn as a polyline; a single-point series renders a
 * flat line. Purely decorative color from tokens; the accessible label carries the meaning.
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  domain,
  ariaLabel,
  className,
}: SparklineProps) {
  const pad = 2;
  const values = data.length > 0 ? data : [0];
  const [min, max] = domain ?? [Math.min(...values), Math.max(...values)];
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <path d={area} className="fill-accent/10" />
      <path
        d={line}
        fill="none"
        className="stroke-accent"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
