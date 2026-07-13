'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTaskDndSensors } from '@/lib/dnd/sensors';
import { computeDropOrder } from '@/lib/dnd/reorder';
import { useTasks } from '@/features/tasks/hooks/use-tasks';
import { useMoveTask } from '@/features/tasks/hooks/use-move-task';
import { useReorderTask } from '@/features/tasks/hooks/use-reorder-task';
import { STATUS_LABEL } from '@/features/tasks/components/status-badge';
import { PriorityBadge } from '@/features/tasks/components/priority-badge';
import { DueDateBadge } from '@/features/tasks/components/due-date-badge';
import { Skeleton } from '@/components/feedback/skeleton';
import type { TaskListItemDto } from '@/features/tasks/types/task-dto';
import type { TaskStatus } from '@/features/tasks/types/task';

const BOARD_STATUSES: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'waiting', 'completed', 'cancelled'];

export function TaskBoard() {
  const { data, isLoading } = useTasks({ sortBy: 'order', sortDir: 'asc', limit: 100 });
  const moveTask = useMoveTask();
  const reorderTask = useReorderTask();
  const sensors = useTaskDndSensors();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const columns = useMemo(() => {
    const grouped = new Map<TaskStatus, TaskListItemDto[]>(BOARD_STATUSES.map((s) => [s, []]));
    for (const task of data?.items ?? []) {
      grouped.get(task.status)?.push(task);
    }
    for (const items of grouped.values()) items.sort((a, b) => a.order - b.order);
    return grouped;
  }, [data]);

  const activeTask = activeId ? data?.items.find((t) => t.id === activeId) : null;

  function findColumn(taskId: string): TaskStatus | null {
    for (const [status, items] of columns) {
      if (items.some((t) => t.id === taskId)) return status;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = String(active.id);
    const sourceStatus = findColumn(activeTaskId);
    if (!sourceStatus) return;

    // `over.id` is either another task id (drop on a card) or a column id (drop on empty column area).
    const overId = String(over.id);
    const targetStatus: TaskStatus = (BOARD_STATUSES as string[]).includes(overId)
      ? (overId as TaskStatus)
      : (findColumn(overId) ?? sourceStatus);

    const destSiblings = (columns.get(targetStatus) ?? []).filter((t) => t.id !== activeTaskId);
    const overIndex = destSiblings.findIndex((t) => t.id === overId);
    const targetIndex = overIndex === -1 ? destSiblings.length : overIndex;
    const newOrder = computeDropOrder(destSiblings, targetIndex);

    if (targetStatus === sourceStatus) {
      reorderTask.mutate({ id: activeTaskId, order: newOrder });
    } else {
      moveTask.mutate({ id: activeTaskId, status: targetStatus, order: newOrder });
      const task = data?.items.find((t) => t.id === activeTaskId);
      setAnnouncement(`${task?.title ?? 'Task'} moved to ${STATUS_LABEL[targetStatus]}`);
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {BOARD_STATUSES.map((s) => (
          <Skeleton key={s} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        role="list"
        aria-label="Task board"
      >
        {BOARD_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={columns.get(status) ?? []}
            onOpen={(id) => router.push(`/tasks/${id}`)}
          />
        ))}
      </div>
      <DragOverlay>{activeTask && <BoardCardContent task={activeTask} />}</DragOverlay>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </DndContext>
  );
}

function BoardColumn({
  status,
  tasks,
  onOpen,
}: {
  status: TaskStatus;
  tasks: TaskListItemDto[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      aria-label={`${STATUS_LABEL[status]} column`}
      className={`flex min-h-[16rem] flex-col gap-2 rounded-lg border p-2 transition-colors ${
        isOver ? 'border-accent bg-accent/5' : 'border-border-subtle bg-surface/40'
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-label text-muted-foreground">{STATUS_LABEL[status]}</span>
        <span className="text-caption text-muted-foreground">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <SortableBoardCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableBoardCard({ task, onOpen }: { task: TaskListItemDto; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="listitem"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(task.id)}
      className={`cursor-grab rounded-md border border-border-subtle bg-surface-elevated p-2.5 text-left transition-opacity active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <BoardCardContent task={task} />
    </div>
  );
}

function BoardCardContent({ task }: { task: TaskListItemDto }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="truncate text-sm text-foreground">{task.title}</span>
      <div className="flex items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        <DueDateBadge dueDate={task.dueDate} completed={task.status === 'completed'} />
      </div>
    </div>
  );
}
