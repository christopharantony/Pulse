import { XIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';
import type { TagDto } from '@/features/tags/api/tags.api';

interface TagChipProps {
  tag: TagDto;
  onRemove?: () => void;
  className?: string;
}

export function TagChip({ tag, onRemove, className }: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-elevated px-2 py-0.5 text-caption font-medium text-foreground',
        className
      )}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color ?? 'var(--color-muted)' }}
      />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
        >
          <XIcon size={11} isAnimated={false} />
        </button>
      )}
    </span>
  );
}
