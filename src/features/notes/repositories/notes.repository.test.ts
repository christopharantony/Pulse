import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { notesRepository } from '@/features/notes/repositories/notes.repository';

describe('notesRepository', () => {
  it('creates a standalone note and defaults plainText to body', async () => {
    const workspaceId = new ObjectId();
    const note = await notesRepository.create(workspaceId, new ObjectId(), {
      title: 'Idea',
      body: 'raw content',
    });
    expect(note.projectId).toBeNull();
    expect(note.plainText).toBe('raw content');
  });

  it('searches notes by extracted plain text within a workspace', async () => {
    const workspaceId = new ObjectId();
    const createdBy = new ObjectId();
    await notesRepository.create(workspaceId, createdBy, {
      title: 'Meeting notes',
      body: '<b>roadmap</b> discussion',
      plainText: 'roadmap discussion',
    });
    await notesRepository.create(workspaceId, createdBy, {
      title: 'Groceries',
      body: 'milk eggs',
      plainText: 'milk eggs',
    });

    const results = await notesRepository.search(workspaceId, 'roadmap');
    expect(results.items).toHaveLength(1);
    expect(results.items[0].title).toBe('Meeting notes');
  });

  it('lists notes linked to a project', async () => {
    const workspaceId = new ObjectId();
    const projectId = new ObjectId();
    await notesRepository.create(workspaceId, new ObjectId(), { title: 'Linked', projectId });
    await notesRepository.create(workspaceId, new ObjectId(), { title: 'Unlinked' });

    const linked = await notesRepository.listByProject(workspaceId, projectId);
    expect(linked.items.map((n) => n.title)).toEqual(['Linked']);
  });
});
