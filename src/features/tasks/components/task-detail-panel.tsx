'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/error-state';
import { CardSkeleton } from '@/components/feedback/skeleton';
import { STATUS_LABEL } from '@/features/tasks/components/status-badge';
import { TagPicker } from '@/features/tags/components/tag-picker';
import { SubtaskTree } from '@/features/tasks/components/subtask-tree';
import { CommentThread } from '@/features/tasks/components/comment-thread';
import { TaskActionsMenu } from '@/features/tasks/components/task-actions-menu';
import { RecurrencePicker } from '@/features/tasks/components/recurrence-picker';
import { TaskTimerWidget } from '@/features/tasks/components/task-timer-widget';
import { useTask } from '@/features/tasks/hooks/use-task';
import { useUpdateTask } from '@/features/tasks/hooks/use-update-task';
import { useCompleteTask } from '@/features/tasks/hooks/use-complete-task';
import type { RecurrenceInput } from '@/features/tasks/api/tasks.api';
import type { TaskPriority, TaskStatus } from '@/features/tasks/types/task';

interface TaskDetailPanelProps {
  taskId: string;
  onBack?: () => void;
}

export function TaskDetailPanel({ taskId, onBack }: TaskDetailPanelProps) {
  const { data: task, isLoading, isError } = useTask(taskId);
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setNotes(task.notes ?? '');
    setTagIds(task.tags.map((t) => t.id));
  }, [task]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !task) {
    return <ErrorState title="Task not found" description="It may have been deleted or moved." />;
  }

  function commitTitle() {
    if (title.trim() && title !== task!.title) {
      updateTask.mutate({ id: taskId, input: { title: title.trim() } });
    }
  }

  function commitDescription() {
    if (description !== (task!.description ?? '')) {
      updateTask.mutate({ id: taskId, input: { description: description || null } });
    }
  }

  function commitNotes() {
    if (notes !== (task!.notes ?? '')) {
      updateTask.mutate({ id: taskId, input: { notes: notes || null } });
    }
  }

  function handleTagsChange(ids: string[]) {
    setTagIds(ids);
    updateTask.mutate({ id: taskId, input: { tagIds: ids } });
  }

  function setStatus(status: TaskStatus) {
    if (status === 'completed') {
      completeTask.mutate(taskId);
    } else {
      updateTask.mutate({ id: taskId, input: { status } });
    }
  }

  function setPriority(priority: TaskPriority) {
    updateTask.mutate({ id: taskId, input: { priority } });
  }

  function setDueDate(value: string) {
    updateTask.mutate({ id: taskId, input: { dueDate: value ? new Date(value).toISOString() : null } });
  }

  function setRecurrence(recurrence: RecurrenceInput | null) {
    updateTask.mutate({ id: taskId, input: { recurrence } });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {onBack ? (
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
        ) : (
          <span />
        )}
        <TaskActionsMenu taskId={taskId} status={task.status} />
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        className="border-none bg-transparent text-h2 text-foreground focus:outline-none"
        aria-label="Task title"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Status</label>
          <Select value={task.status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Priority</label>
          <Select value={task.priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['none', 'low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <SelectItem key={p} value={p}>
                  {p === 'none' ? 'No priority' : p[0].toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-label text-muted-foreground">
            <Calendar size={12} />
            Due date
          </label>
          <input
            type="date"
            defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-surface/60 px-3.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <TaskTimerWidget taskId={task.id} />

      <div className="flex flex-col gap-1.5">
        <label className="text-label text-muted-foreground">Tags</label>
        <TagPicker selectedIds={tagIds} onChange={handleTagsChange} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-label text-muted-foreground">Repeat</label>
        <RecurrencePicker
          value={
            task.recurrence
              ? {
                  frequency: task.recurrence.frequency,
                  interval: task.recurrence.interval,
                  daysOfWeek: task.recurrence.daysOfWeek,
                  completionBehavior: task.recurrence.completionBehavior,
                }
              : null
          }
          onChange={setRecurrence}
        />
      </div>

      <Textarea
        label="Description"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={commitDescription}
      />

      <Textarea
        label="Notes"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={commitNotes}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-label text-muted-foreground">Subtasks</label>
        <SubtaskTree taskId={taskId} subtasks={task.subtasks} />
      </div>

      <CommentThread taskId={taskId} />
    </div>
  );
}
