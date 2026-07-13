'use client';

import { useState } from 'react';
import { Trash2Icon } from '@animateicons/react/lucide';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useTags } from '@/features/tags/hooks/use-tags';
import { useRenameTag } from '@/features/tags/hooks/use-rename-tag';
import { useDeleteTag } from '@/features/tags/hooks/use-delete-tag';

export function TagManagerDialog({ trigger }: { trigger: React.ReactNode }) {
  const { data: tags = [] } = useTags();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setDraftName(name);
  }

  function commitEdit() {
    if (editingId && draftName.trim()) {
      renameTag.mutate({ id: editingId, input: { name: draftName.trim() } });
    }
    setEditingId(null);
  }

  return (
    <Modal>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Manage tags</ModalTitle>
        </ModalHeader>
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color ?? 'var(--color-muted)' }} />
              {editingId === tag.id ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  className="h-8 flex-1 rounded-md border border-border bg-surface/60 px-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(tag.id, tag.name)}
                  className="flex-1 truncate text-left text-sm text-foreground"
                >
                  {tag.name}
                </button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Delete tag ${tag.name}`}
                onClick={() => deleteTag.mutate(tag.id)}
              >
                <Trash2Icon size={14} isAnimated={false} />
              </Button>
            </div>
          ))}
          {tags.length === 0 && <p className="text-small text-muted-foreground">No tags yet.</p>}
        </div>
      </ModalContent>
    </Modal>
  );
}
