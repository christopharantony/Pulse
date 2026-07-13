'use client';

import { Archive, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBulkArchiveTasks, useBulkDeleteTasks } from '@/features/tasks/hooks/use-bulk-task-actions';

interface BulkActionsToolbarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionsToolbar({ selectedIds, onClear }: BulkActionsToolbarProps) {
  const bulkArchive = useBulkArchiveTasks();
  const bulkDelete = useBulkDeleteTasks();

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 animate-fade-in-up">
      <span className="text-sm text-foreground">{selectedIds.length} selected</span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            bulkArchive.mutate(selectedIds);
            onClear();
          }}
        >
          <Archive size={14} />
          Archive
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            bulkDelete.mutate(selectedIds);
            onClear();
          }}
        >
          <Trash2 size={14} />
          Delete
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Clear selection" onClick={onClear}>
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
