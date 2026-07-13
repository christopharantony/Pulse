'use client';

import { useState } from 'react';
import { Plus, Timer, Repeat, FolderPlus, Search, X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useQuickCreateTask } from '@/features/dashboard/hooks/use-quick-create-task';

const SOON_ACTIONS = [
  { label: 'Start Focus', icon: Timer },
  { label: 'Add Habit', icon: Repeat },
  { label: 'New Project', icon: FolderPlus },
  { label: 'Search', icon: Search },
] as const;

/**
 * Quick Actions: an inline task quick-create (fully wired) plus shortcuts for actions whose own
 * features ship in later phases (they surface a friendly "coming soon" toast rather than dead-end).
 */
export function QuickActionsCard() {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const quickCreate = useQuickCreateTask();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    quickCreate.mutate(
      { title: trimmed },
      {
        onSuccess: () => {
          toast({ title: 'Task created', variant: 'success' });
          setTitle('');
          setCreating(false);
        },
        onError: () => toast({ title: 'Could not create task', variant: 'destructive' }),
      }
    );
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="pb-0">
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>

      {creating ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Input
            autoFocus
            label="New task"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" isLoading={quickCreate.isPending}>
              Add task
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreating(false);
                setTitle('');
              }}
            >
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Create Task
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {SOON_ACTIONS.map(({ label, icon: Icon }) => (
          <Button
            key={label}
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => toast({ title: `${label} is coming soon` })}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
