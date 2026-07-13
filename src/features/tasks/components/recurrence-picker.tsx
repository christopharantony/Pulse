'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { RecurrenceInput } from '@/features/tasks/api/tasks.api';

const FREQUENCIES: { value: RecurrenceInput['frequency']; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

interface RecurrencePickerProps {
  value: RecurrenceInput | null;
  onChange: (value: RecurrenceInput | null) => void;
}

/**
 * Frequency + interval ("every X days/weeks/months/years") + optional weekday multi-select
 * (weekly + daysOfWeek=[1..5] covers "weekdays") + completion-behavior (fixed vs. rolling).
 */
export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const frequency = value?.frequency ?? 'none';

  function set(patch: Partial<RecurrenceInput>) {
    if (frequency === 'none' && !patch.frequency) return;
    const next: RecurrenceInput = {
      frequency: value?.frequency ?? 'daily',
      interval: value?.interval ?? 1,
      daysOfWeek: value?.daysOfWeek,
      completionBehavior: value?.completionBehavior ?? 'fixed',
      ...patch,
    };
    onChange(next.frequency === 'none' ? null : next);
  }

  function toggleWeekday(day: number) {
    const current = value?.daysOfWeek ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    set({ daysOfWeek: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={frequency} onValueChange={(v) => set({ frequency: v as RecurrenceInput['frequency'] })}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FREQUENCIES.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {frequency !== 'none' && (
        <div className="flex flex-col gap-2 rounded-md border border-border-subtle p-2.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Every
            <Input
              label=""
              type="number"
              min={1}
              value={value?.interval ?? 1}
              onChange={(e) => set({ interval: Math.max(1, Number(e.target.value) || 1) })}
              className="h-8 w-16"
            />
            {frequency}
            {frequency === 'weekly' ? '(s)' : ''}
          </div>

          {frequency === 'weekly' && (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  size="sm"
                  variant={(value?.daysOfWeek ?? []).includes(day.value) ? 'primary' : 'outline'}
                  onClick={() => toggleWeekday(day.value)}
                  className="h-7 px-2 text-xs"
                >
                  {day.label}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            On completion:
            <Select
              value={value?.completionBehavior ?? 'fixed'}
              onValueChange={(v) => set({ completionBehavior: v as RecurrenceInput['completionBehavior'] })}
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed schedule</SelectItem>
                <SelectItem value="rolling">Rolling from completion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
