'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useTags } from '@/features/tags/hooks/use-tags';
import { STATUS_LABEL } from '@/features/tasks/components/status-badge';
import type { TaskPriority, TaskStatus } from '@/features/tasks/types/task';

export interface TaskFilters {
  status: TaskStatus[];
  priority: TaskPriority[];
  tagIds: string[];
}

interface TaskFiltersBarProps {
  value: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

const ALL_STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[];
const ALL_PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none'];

export function TaskFiltersBar({ value, onChange }: TaskFiltersBarProps) {
  const { data: tags = [] } = useTags();
  const activeCount = value.status.length + value.priority.length + value.tagIds.length;

  function toggle<K extends keyof TaskFilters>(key: K, item: TaskFilters[K][number]) {
    const list = value[key] as unknown[];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPopover label="Status" count={value.status.length}>
        {ALL_STATUSES.map((status) => (
          <Checkbox
            key={status}
            name={`filter-status-${status}`}
            label={STATUS_LABEL[status]}
            checked={value.status.includes(status)}
            onChange={() => toggle('status', status)}
          />
        ))}
      </FilterPopover>

      <FilterPopover label="Priority" count={value.priority.length}>
        {ALL_PRIORITIES.map((priority) => (
          <Checkbox
            key={priority}
            name={`filter-priority-${priority}`}
            label={priority === 'none' ? 'No priority' : priority[0].toUpperCase() + priority.slice(1)}
            checked={value.priority.includes(priority)}
            onChange={() => toggle('priority', priority)}
          />
        ))}
      </FilterPopover>

      <FilterPopover label="Tags" count={value.tagIds.length}>
        {tags.length === 0 && <p className="text-caption text-muted-foreground">No tags yet.</p>}
        {tags.map((tag) => (
          <Checkbox
            key={tag.id}
            name={`filter-tag-${tag.id}`}
            label={tag.name}
            checked={value.tagIds.includes(tag.id)}
            onChange={() => toggle('tagIds', tag.id)}
          />
        ))}
      </FilterPopover>

      {activeCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ status: [], priority: [], tagIds: [] })}
        >
          Clear filters ({activeCount})
        </Button>
      )}
    </div>
  );
}

function FilterPopover({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {label}
          {count > 0 && <span className="ml-1 text-accent">({count})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
