'use client';

import { useState } from 'react';
import { PlusIcon } from '@animateicons/react/lucide';
import { Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useTags } from '@/features/tags/hooks/use-tags';
import { useCreateTag } from '@/features/tags/hooks/use-create-tag';
import { TagChip } from '@/features/tags/components/tag-chip';
import type { TagDto } from '@/features/tags/api/tags.api';

interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/** Popover multi-select for a task's tags, with inline "create a new tag by typing its name." */
export function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const [draft, setDraft] = useState('');

  const selected = tags.filter((t) => selectedIds.includes(t.id));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function createAndSelect() {
    const name = draft.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync({ name });
    onChange([...selectedIds, tag.id]);
    setDraft('');
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <TagChip key={tag.id} tag={tag} onRemove={() => toggle(tag.id)} />
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-subtle px-2 py-0.5 text-caption text-muted-foreground hover:border-accent hover:text-accent"
          >
            <Tag size={12} />
            Tag
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="flex flex-col gap-2">
            <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
              {tags.map((tag: TagDto) => (
                <Checkbox
                  key={tag.id}
                  name={`tag-${tag.id}`}
                  label={tag.name}
                  checked={selectedIds.includes(tag.id)}
                  onChange={() => toggle(tag.id)}
                />
              ))}
              {tags.length === 0 && <p className="text-caption text-muted-foreground">No tags yet.</p>}
            </div>
            <div className="flex items-center gap-1.5 border-t border-border-subtle pt-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createAndSelect())}
                placeholder="New tag name"
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface/60 px-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <Button type="button" size="icon" variant="ghost" onClick={createAndSelect} aria-label="Create tag">
                <PlusIcon size={16} isAnimated={false} />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
