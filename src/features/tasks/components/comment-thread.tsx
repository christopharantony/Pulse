'use client';

import { useState } from 'react';
import { SendIcon, Trash2Icon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { useAddComment, useDeleteComment, useTaskComments } from '@/features/tasks/hooks/use-task-comments';

export function CommentThread({ taskId }: { taskId: string }) {
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const addComment = useAddComment(taskId);
  const deleteComment = useDeleteComment(taskId);
  const [draft, setDraft] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    await addComment.mutateAsync(body);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-label text-muted-foreground">Comments</h3>
      {isLoading && <p className="text-caption text-muted-foreground">Loading…</p>}
      <ul className="flex flex-col gap-2" role="list">
        {comments.map((comment) => (
          <li key={comment.id} className="group flex items-start justify-between gap-2 rounded-md border border-border-subtle p-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-foreground">{comment.body}</span>
              <span className="text-caption text-muted-foreground">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              aria-label="Delete comment"
              onClick={() => deleteComment.mutate(comment.id)}
              className="opacity-0 text-muted-foreground hover:text-destructive group-hover:opacity-100"
            >
              <Trash2Icon size={13} isAnimated={false} />
            </button>
          </li>
        ))}
        {!isLoading && comments.length === 0 && (
          <p className="text-caption text-muted-foreground">No comments yet.</p>
        )}
      </ul>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="h-9 flex-1 rounded-md border border-border bg-surface/60 px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <Button type="submit" size="icon" variant="ghost" aria-label="Send comment" isLoading={addComment.isPending}>
          <SendIcon size={16} isAnimated={false} />
        </Button>
      </form>
    </div>
  );
}
