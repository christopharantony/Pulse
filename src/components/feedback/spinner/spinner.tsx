import { LoaderCircleIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

const sizeMap = { sm: 14, md: 20, lg: 28 } as const;

interface SpinnerProps {
  size?: keyof typeof sizeMap;
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <LoaderCircleIcon
      size={sizeMap[size]}
      isAnimated={false}
      className={cn('animate-spin text-accent', className)}
    />
  );
}
