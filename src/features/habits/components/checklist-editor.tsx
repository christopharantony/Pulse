'use client';

import { Button } from '@/components/ui/button';
import type { HabitChecklistItemInput } from '@/features/habits/api/habits.api';

interface ChecklistEditorProps {
  items: HabitChecklistItemInput[];
  onChange: (items: HabitChecklistItemInput[]) => void;
}

function newItemId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `item_${Date.now()}_${Math.random()}`;
}

/** Add/remove/reorder editor for a checklist habit's daily items (e.g. "Morning Routine" → items). */
export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  function addItem() {
    onChange([...items, { id: newItemId(), name: '', order: items.length }]);
  }
  function updateName(id: string, name: string) {
    onChange(items.map((item) => (item.id === id ? { ...item, name } : item)));
  }
  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id).map((item, i) => ({ ...item, order: i })));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-label text-muted-foreground">Checklist items</label>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            aria-label={`Item ${i + 1}`}
            placeholder={`Item ${i + 1}`}
            value={item.name}
            onChange={(e) => updateName(item.id, e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-surface/60 px-3.5 text-sm text-foreground placeholder:text-muted transition-colors duration-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        Add item
      </Button>
    </div>
  );
}
