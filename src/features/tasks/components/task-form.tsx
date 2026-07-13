'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagPicker } from '@/features/tags/components/tag-picker';
import { STATUS_LABEL } from '@/features/tasks/components/status-badge';
import type { TaskDetailDto } from '@/features/tasks/types/task-dto';
import type { CreateTaskInput } from '@/features/tasks/api/tasks.api';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(10_000).optional(),
  status: z.enum(['inbox', 'todo', 'in_progress', 'waiting', 'completed', 'cancelled', 'archived']),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
  dueDate: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  initial?: TaskDetailDto;
  onSubmit: (input: CreateTaskInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function TaskForm({ initial, onSubmit, onCancel, submitLabel = 'Save', isSubmitting }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      status: initial?.status ?? 'inbox',
      priority: initial?.priority ?? 'none',
      dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
    },
  });

  const status = watch('status');
  const priority = watch('priority');
  const [tagIds, setTagIds] = useState(initial?.tags.map((t) => t.id) ?? []);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      tagIds,
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Title" autoFocus error={errors.title?.message} {...register('title')} />
      <Textarea label="Description" rows={3} error={errors.description?.message} {...register('description')} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Status</label>
          <Select value={status} onValueChange={(v) => setValue('status', v as TaskFormValues['status'])}>
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
          <Select value={priority} onValueChange={(v) => setValue('priority', v as TaskFormValues['priority'])}>
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
      </div>

      <Input label="Due date" type="date" error={errors.dueDate?.message} {...register('dueDate')} />

      <div className="flex flex-col gap-1.5">
        <label className="text-label text-muted-foreground">Tags</label>
        <TagPicker selectedIds={tagIds} onChange={setTagIds} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={formSubmitting || isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
