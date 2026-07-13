'use client';

import { useState } from 'react';
import { PlusIcon } from '@animateicons/react/lucide';
import { useCreateTask } from '@/features/tasks/hooks/use-create-task';
import type { TaskPriority, TaskStatus } from '@/features/tasks/types/task';

const PRIORITY_TOKENS: Record<string, TaskPriority> = { '1': 'urgent', '2': 'high', '3': 'medium', '4': 'low' };
const DATE_TOKENS: Record<string, () => Date> = {
  today: () => new Date(),
  tomorrow: () => new Date(Date.now() + 86_400_000),
};

/**
 * Single-line capture with lightweight inline token parsing — `#tag` and `!1..4` (priority) and
 * `@today`/`@tomorrow` are stripped from the title and mapped to fields client-side before submit.
 * Deterministic token parsing, not NLP date parsing (that's a later, AI-assistant-era feature).
 */
export function TaskQuickAdd({ defaultStatus = 'inbox' as TaskStatus }: { defaultStatus?: TaskStatus }) {
  const [value, setValue] = useState('');
  const createTask = useCreateTask();

  function parse(raw: string) {
    let title = raw;
    let priority: TaskPriority | undefined;
    let dueDate: string | undefined;

    title = title.replace(/!(\d)/g, (_match, digit: string) => {
      if (PRIORITY_TOKENS[digit]) priority = PRIORITY_TOKENS[digit];
      return '';
    });
    title = title.replace(/@(\w+)/g, (_match, word: string) => {
      const fn = DATE_TOKENS[word.toLowerCase()];
      if (fn) dueDate = fn().toISOString();
      return '';
    });

    return { title: title.trim().replace(/\s+/g, ' '), priority, dueDate };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const { title, priority, dueDate } = parse(trimmed);
    if (!title) return;

    await createTask.mutateAsync({ title, status: defaultStatus, priority, dueDate });
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b border-border-subtle pb-3">
      <PlusIcon size={16} isAnimated={false} className="shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task... (try !1 for urgent, @today or @tomorrow)"
        className="h-9 flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        aria-label="Quick add task"
      />
    </form>
  );
}
