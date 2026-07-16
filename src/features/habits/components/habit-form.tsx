'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FrequencyPicker } from '@/features/habits/components/frequency-picker';
import { ChecklistEditor } from '@/features/habits/components/checklist-editor';
import { HABIT_TYPE_LABEL } from '@/features/habits/components/habit-type-badge';
import type { HabitDto } from '@/features/habits/types/habit-dto';
import type {
  CreateHabitInput,
  HabitChecklistItemInput,
  HabitReminderInput,
  RecurrenceInput,
} from '@/features/habits/api/habits.api';

const habitFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  color: z.string().optional(),
  icon: z.string().max(32).optional(),
  category: z.string().max(50).optional(),
  targetValue: z.union([z.number().positive(), z.nan()]).optional(),
  unit: z.string().max(20).optional(),
  targetPerPeriod: z.union([z.number().int().min(1), z.nan()]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type HabitFormValues = z.infer<typeof habitFormSchema>;

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];
const SUGGESTED_CATEGORIES = ['Health', 'Fitness', 'Learning', 'Finance', 'Mindfulness', 'Reading', 'Work', 'Personal'];

interface HabitFormProps {
  initial?: HabitDto;
  onSubmit: (input: CreateHabitInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function HabitForm({ initial, onSubmit, onCancel, submitLabel = 'Save', isSubmitting }: HabitFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      color: initial?.color ?? DEFAULT_COLORS[0],
      icon: initial?.icon ?? '',
      category: initial?.category ?? '',
      targetValue: initial?.targetValue ?? undefined,
      unit: initial?.unit ?? '',
      targetPerPeriod: initial?.targetPerPeriod ?? undefined,
      startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
      endDate: initial?.endDate ? initial.endDate.slice(0, 10) : '',
    },
  });

  const color = watch('color');
  const [type, setType] = useState<CreateHabitInput['type']>(initial?.type ?? 'boolean');
  const [recurrence, setRecurrence] = useState<RecurrenceInput>(
    initial?.recurrence ?? { frequency: 'daily', interval: 1 }
  );
  const [specificDates, setSpecificDates] = useState<string[]>(
    (initial?.specificDates ?? []).map((d) => d.slice(0, 10))
  );
  const [checklistItems, setChecklistItems] = useState<HabitChecklistItemInput[]>(
    initial?.checklistItems ?? [{ id: crypto.randomUUID(), name: '', order: 0 }]
  );
  const [reminders, setReminders] = useState<HabitReminderInput[]>(
    initial?.reminders.map((r) => ({ timeOfDay: r.timeOfDay, enabled: r.enabled })) ?? []
  );

  const submit = handleSubmit(async (values) => {
    if ((type === 'numeric' || type === 'duration') && (values.targetValue == null || Number.isNaN(values.targetValue))) {
      setError('targetValue', { message: type === 'duration' ? 'Target minutes is required' : 'Target value is required' });
      return;
    }

    await onSubmit({
      name: values.name,
      description: values.description || null,
      color: values.color || null,
      icon: values.icon || null,
      category: values.category || null,
      type,
      recurrence,
      specificDates: specificDates.length ? specificDates : null,
      startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
      endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
      targetPerPeriod: values.targetPerPeriod && !Number.isNaN(values.targetPerPeriod) ? values.targetPerPeriod : null,
      targetValue: values.targetValue && !Number.isNaN(values.targetValue) ? values.targetValue : null,
      unit: values.unit || null,
      checklistItems: type === 'checklist' ? checklistItems.filter((i) => i.name.trim()) : null,
      reminders,
    });
  });

  function addReminder() {
    setReminders([...reminders, { timeOfDay: '08:00', enabled: true }]);
  }

  return (
    <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-col gap-1.5">
        <label className="text-label text-muted-foreground">Habit type</label>
        {initial ? (
          <p className="text-small text-foreground">{HABIT_TYPE_LABEL[type]} (can&apos;t be changed)</p>
        ) : (
          <Select value={type} onValueChange={(v) => setType(v as CreateHabitInput['type'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HABIT_TYPE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Input label="Name" autoFocus error={errors.name?.message} {...register('name')} />
      <Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Icon / emoji" placeholder="💧" error={errors.icon?.message} {...register('icon')} />
        <div className="flex flex-col gap-1.5">
          <Input label="Category" list="habit-categories" placeholder="Health" {...register('category')} />
          <datalist id="habit-categories">
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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

      {(type === 'numeric' || type === 'duration') && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={type === 'duration' ? 'Target minutes' : 'Target value'}
            type="number"
            step="any"
            min={0}
            error={errors.targetValue?.message}
            {...register('targetValue', { valueAsNumber: true })}
          />
          {type === 'numeric' && (
            <Input label="Unit" placeholder="glasses, steps, L…" error={errors.unit?.message} {...register('unit')} />
          )}
        </div>
      )}

      {type === 'checklist' && <ChecklistEditor items={checklistItems} onChange={setChecklistItems} />}

      <FrequencyPicker
        recurrence={recurrence}
        specificDates={specificDates}
        onChange={(v) => {
          setRecurrence(v.recurrence);
          setSpecificDates(v.specificDates);
        }}
      />

      {recurrence.frequency === 'weekly' && (
        <Input
          label="Target per week (optional — for a period-based streak like '3x/week')"
          type="number"
          min={1}
          error={errors.targetPerPeriod?.message}
          {...register('targetPerPeriod', { valueAsNumber: true })}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Start date" type="date" {...register('startDate')} />
        <Input label="End date (optional)" type="date" {...register('endDate')} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-label text-muted-foreground">Reminders</label>
        {reminders.map((reminder, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="time"
              aria-label={`Reminder ${i + 1} time`}
              value={reminder.timeOfDay}
              className="h-11 rounded-md border border-border bg-surface/60 px-3.5 text-sm text-foreground transition-colors duration-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              onChange={(e) => {
                const next = [...reminders];
                next[i] = { ...next[i], timeOfDay: e.target.value };
                setReminders(next);
              }}
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setReminders(reminders.filter((_, idx) => idx !== i))}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addReminder}>
          Add reminder
        </Button>
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
