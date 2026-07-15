'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GOAL_CATEGORY_LABEL } from '@/features/goals/components/goal-category-badge';
import { GOAL_PRIORITY_LABEL } from '@/features/goals/components/goal-priority-badge';
import type { GoalDto, CreateGoalInput, GoalCategory, GoalPriority, GoalProgressMethod } from '@/features/goals/api/goals.api';

const goalFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(4000).optional(),
  icon: z.string().max(32).optional(),
  color: z.string().optional(),
  customCategoryLabel: z.string().max(50).optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  targetValue: z.union([z.number().positive(), z.nan()]).optional(),
});
type GoalFormValues = z.infer<typeof goalFormSchema>;

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

const PROGRESS_METHOD_LABEL: Record<GoalProgressMethod, string> = {
  manual: 'Manual',
  milestone: 'Milestones',
  task: 'Tasks',
  habit: 'Habits',
  mixed: 'Mixed',
};

interface GoalFormProps {
  initial?: GoalDto;
  onSubmit: (input: CreateGoalInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function GoalForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      icon: initial?.icon ?? '',
      color: initial?.color ?? DEFAULT_COLORS[0],
      customCategoryLabel: initial?.customCategoryLabel ?? '',
      startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
      targetDate: initial?.targetDate ? initial.targetDate.slice(0, 10) : '',
      targetValue: initial?.targetValue ?? undefined,
    },
  });

  const color = watch('color');
  const [category, setCategory] = useState<GoalCategory>(initial?.category ?? 'personal');
  const [priority, setPriority] = useState<GoalPriority>(initial?.priority ?? 'medium');
  const [progressMethod, setProgressMethod] = useState<GoalProgressMethod>(initial?.progressMethod ?? 'manual');

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      title: values.title,
      description: values.description || null,
      icon: values.icon || null,
      color: values.color || null,
      category,
      customCategoryLabel: category === 'custom' ? values.customCategoryLabel || null : null,
      priority,
      progressMethod,
      startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
      targetDate: values.targetDate ? new Date(values.targetDate).toISOString() : null,
      targetValue: values.targetValue && !Number.isNaN(values.targetValue) ? values.targetValue : null,
    });
  });

  return (
    <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
      <Input label="Title" autoFocus error={errors.title?.message} {...register('title')} />
      <Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Icon / emoji" placeholder="🎯" error={errors.icon?.message} {...register('icon')} />
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Category</label>
          <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GOAL_CATEGORY_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {category === 'custom' && (
        <Input label="Custom category name" error={errors.customCategoryLabel?.message} {...register('customCategoryLabel')} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Priority</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as GoalPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GOAL_PRIORITY_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Progress method</label>
          <Select value={progressMethod} onValueChange={(v) => setProgressMethod(v as GoalProgressMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROGRESS_METHOD_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-label text-muted-foreground">Color</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => setValue('color', c)}
              className="size-7 rounded-full border-2 transition-transform"
              style={{ backgroundColor: c, borderColor: color === c ? c : 'transparent', transform: color === c ? 'scale(1.15)' : undefined }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Start date" type="date" {...register('startDate')} />
        <Input label="Target date" type="date" {...register('targetDate')} />
      </div>

      {(progressMethod === 'manual' || progressMethod === 'habit') && (
        <Input
          label="Target value (optional — e.g. '24' for 'Read 24 books')"
          type="number"
          step="any"
          min={0}
          error={errors.targetValue?.message}
          {...register('targetValue', { valueAsNumber: true })}
        />
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
