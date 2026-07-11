import { forwardRef, type HTMLAttributes, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const sizeMap = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
} as const;

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof sizeMap;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-elevated font-semibold text-foreground',
        sizeMap[size],
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {}

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt, ...props }, ref) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} alt={alt} className={cn('size-full object-cover', className)} {...props} />
  )
);
AvatarImage.displayName = 'AvatarImage';

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

interface AvatarFallbackProps extends HTMLAttributes<HTMLSpanElement> {}

export const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn('flex size-full items-center justify-center uppercase', className)} {...props} />
  )
);
AvatarFallback.displayName = 'AvatarFallback';
