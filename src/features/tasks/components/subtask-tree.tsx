'use client';

import { useState } from 'react';
import { CheckIcon, PlusIcon, XIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';
import { useAddSubtask, useRemoveSubtask, useUpdateSubtask } from '@/features/tasks/hooks/use-subtasks';
import type { SubtaskDto } from '@/features/tasks/types/task-dto';

interface SubtaskTreeProps {
  taskId: string;
  subtasks: SubtaskDto[];
}

/** Recursive subtask CRUD list. Reordering (drag) is layered on in the drag-and-drop milestone. */
export function SubtaskTree({ taskId, subtasks }: SubtaskTreeProps) {
  const progress = countProgress(subtasks);

  return (
    <div className="flex flex-col gap-2">
      {progress.total > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-caption text-muted-foreground" aria-live="polite">
            {progress.completed} of {progress.total} complete
          </span>
        </div>
      )}
      <SubtaskLevel taskId={taskId} nodes={subtasks} parentSubtaskId={null} depth={0} />
    </div>
  );
}

function countProgress(subtasks: SubtaskDto[]): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const node of subtasks) {
    total += 1;
    if (node.completed) completed += 1;
    const child = countProgress(node.children);
    completed += child.completed;
    total += child.total;
  }
  return { completed, total };
}

function SubtaskLevel({
  taskId,
  nodes,
  parentSubtaskId,
  depth,
}: {
  taskId: string;
  nodes: SubtaskDto[];
  parentSubtaskId: string | null;
  depth: number;
}) {
  const addSubtask = useAddSubtask(taskId);
  const [draft, setDraft] = useState('');

  return (
    <ul className={cn('flex flex-col gap-1', depth > 0 && 'ml-6 border-l border-border-subtle pl-3')} role="list">
      {nodes.map((node) => (
        <SubtaskNode key={node.id} taskId={taskId} node={node} depth={depth} />
      ))}
      <li className="flex items-center gap-2">
        <PlusIcon size={12} isAnimated={false} className="text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !draft.trim()) return;
            e.preventDefault();
            addSubtask.mutate({ title: draft.trim(), parentSubtaskId });
            setDraft('');
          }}
          placeholder={depth === 0 ? 'Add subtask' : 'Add nested subtask'}
          className="h-7 flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </li>
    </ul>
  );
}

function SubtaskNode({ taskId, node, depth }: { taskId: string; node: SubtaskDto; depth: number }) {
  const updateSubtask = useUpdateSubtask(taskId);
  const removeSubtask = useRemoveSubtask(taskId);
  const [expanded, setExpanded] = useState(true);

  return (
    <li>
      <div className="group flex items-center gap-2">
        <button
          type="button"
          aria-label={node.completed ? 'Mark subtask incomplete' : 'Mark subtask complete'}
          onClick={() => updateSubtask.mutate({ subtaskId: node.id, patch: { completed: !node.completed } })}
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
            node.completed ? 'border-success bg-success text-success-foreground' : 'border-border hover:border-accent'
          )}
        >
          {node.completed && <CheckIcon size={10} isAnimated={false} />}
        </button>
        <span
          className={cn(
            'flex-1 truncate text-sm',
            node.completed ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {node.title}
        </span>
        {node.children.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-caption text-muted-foreground hover:text-foreground"
          >
            {expanded ? 'Collapse' : `Expand (${node.children.length})`}
          </button>
        )}
        <button
          type="button"
          aria-label="Remove subtask"
          onClick={() => removeSubtask.mutate(node.id)}
          className="opacity-0 text-muted-foreground hover:text-destructive group-hover:opacity-100"
        >
          <XIcon size={12} isAnimated={false} />
        </button>
      </div>
      {expanded && (node.children.length > 0 || depth < 4) && (
        <SubtaskLevel taskId={taskId} nodes={node.children} parentSubtaskId={node.id} depth={depth + 1} />
      )}
    </li>
  );
}
