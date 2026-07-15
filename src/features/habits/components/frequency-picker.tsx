'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { RecurrenceInput } from '@/features/habits/api/habits.api';

export type FrequencyPreset =
  | 'daily'
  | 'every_n_days'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'every_n_weeks'
  | 'monthly'
  | 'yearly'
  | 'specific_dates';

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function presetFromRecurrence(recurrence: RecurrenceInput, hasSpecificDates: boolean): FrequencyPreset {
  if (hasSpecificDates) return 'specific_dates';
  const interval = recurrence.interval ?? 1;
  if (recurrence.frequency === 'daily') return interval > 1 ? 'every_n_days' : 'daily';
  if (recurrence.frequency === 'weekly') {
    const days = recurrence.daysOfWeek ?? [];
    if (interval > 1) return 'every_n_weeks';
    if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return 'weekdays';
    if (days.length === 2 && WEEKENDS.every((d) => days.includes(d))) return 'weekends';
    return 'weekly';
  }
  if (recurrence.frequency === 'monthly') return 'monthly';
  if (recurrence.frequency === 'yearly') return 'yearly';
  return 'daily';
}

interface FrequencyPickerProps {
  recurrence: RecurrenceInput;
  specificDates: string[];
  onChange: (value: { recurrence: RecurrenceInput; specificDates: string[] }) => void;
}

/** Recurrence + specific-dates editor — the UI for the recurrence engine described in the plan. */
export function FrequencyPicker({ recurrence, specificDates, onChange }: FrequencyPickerProps) {
  const preset = presetFromRecurrence(recurrence, specificDates.length > 0);

  function setPreset(next: FrequencyPreset) {
    switch (next) {
      case 'daily':
        return onChange({ recurrence: { frequency: 'daily', interval: 1 }, specificDates: [] });
      case 'every_n_days':
        return onChange({ recurrence: { frequency: 'daily', interval: 2 }, specificDates: [] });
      case 'weekdays':
        return onChange({ recurrence: { frequency: 'weekly', interval: 1, daysOfWeek: WEEKDAYS }, specificDates: [] });
      case 'weekends':
        return onChange({ recurrence: { frequency: 'weekly', interval: 1, daysOfWeek: WEEKENDS }, specificDates: [] });
      case 'weekly':
        return onChange({ recurrence: { frequency: 'weekly', interval: 1, daysOfWeek: [1] }, specificDates: [] });
      case 'every_n_weeks':
        return onChange({ recurrence: { frequency: 'weekly', interval: 2, daysOfWeek: [1] }, specificDates: [] });
      case 'monthly':
        return onChange({ recurrence: { frequency: 'monthly', interval: 1 }, specificDates: [] });
      case 'yearly':
        return onChange({ recurrence: { frequency: 'yearly', interval: 1 }, specificDates: [] });
      case 'specific_dates':
        return onChange({ recurrence: { frequency: 'none', interval: 1 }, specificDates: specificDates.length ? specificDates : [] });
    }
  }

  function toggleDay(day: number) {
    const days = recurrence.daysOfWeek ?? [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    onChange({ recurrence: { ...recurrence, daysOfWeek: next }, specificDates });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-label text-muted-foreground">Frequency</label>
        <Select value={preset} onValueChange={(v) => setPreset(v as FrequencyPreset)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="every_n_days">Every N days</SelectItem>
            <SelectItem value="weekdays">Weekdays</SelectItem>
            <SelectItem value="weekends">Weekends</SelectItem>
            <SelectItem value="weekly">Weekly (choose days)</SelectItem>
            <SelectItem value="every_n_weeks">Every N weeks</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="specific_dates">Specific dates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {preset === 'every_n_days' && (
        <Input
          label="Repeat every N days"
          type="number"
          min={2}
          value={recurrence.interval ?? 2}
          onChange={(e) => onChange({ recurrence: { ...recurrence, interval: Number(e.target.value) || 2 }, specificDates })}
        />
      )}

      {preset === 'every_n_weeks' && (
        <Input
          label="Repeat every N weeks"
          type="number"
          min={2}
          value={recurrence.interval ?? 2}
          onChange={(e) => onChange({ recurrence: { ...recurrence, interval: Number(e.target.value) || 2 }, specificDates })}
        />
      )}

      {(preset === 'weekly' || preset === 'every_n_weeks') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Days</label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, day) => {
              const active = (recurrence.daysOfWeek ?? []).includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={active}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full border text-caption font-medium transition-colors',
                    active
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border text-muted-foreground hover:border-accent/50'
                  )}
                >
                  {label[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {preset === 'specific_dates' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-muted-foreground">Dates</label>
          <div className="flex flex-wrap gap-1.5">
            {specificDates.map((d) => (
              <span
                key={d}
                className="flex items-center gap-1 rounded-full border border-border bg-surface/40 px-2.5 py-1 text-caption"
              >
                {d}
                <button
                  type="button"
                  aria-label={`Remove ${d}`}
                  onClick={() => onChange({ recurrence, specificDates: specificDates.filter((x) => x !== d) })}
                  className="text-muted hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="date"
            aria-label="Add a specific date"
            onChange={(e) => {
              const value = e.target.value;
              if (!value || specificDates.includes(value)) return;
              onChange({ recurrence, specificDates: [...specificDates, value].sort() });
              e.target.value = '';
            }}
            className="h-11 w-full rounded-md border border-border bg-surface/60 px-3.5 text-sm text-foreground transition-colors duration-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      )}

      <Checkbox
        label="Repeats indefinitely (uncheck to set an end date)"
        checked={!recurrence.endDate}
        onChange={(e) =>
          onChange({
            recurrence: { ...recurrence, endDate: e.target.checked ? null : new Date().toISOString() },
            specificDates,
          })
        }
      />
      {recurrence.endDate && (
        <Input
          label="Ends on"
          type="date"
          value={recurrence.endDate.slice(0, 10)}
          onChange={(e) => onChange({ recurrence: { ...recurrence, endDate: new Date(e.target.value).toISOString() }, specificDates })}
        />
      )}
    </div>
  );
}
