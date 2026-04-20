'use client';
import { useState } from 'react';
import { ViewListPanel } from './ViewListPanel';
import { ViewStudio } from './ViewStudio';
import type { SavedViewRow } from '@/types/admin';

type EditorMode = 'list' | 'create' | 'edit';

export function ViewEditorPanel() {
  const [mode, setMode] = useState<EditorMode>('list');
  const [editingView, setEditingView] = useState<SavedViewRow | null>(null);

  function handleCreate() {
    setEditingView(null);
    setMode('create');
  }

  function handleEdit(view: SavedViewRow) {
    setEditingView(view);
    setMode('edit');
  }

  function handleBack() {
    setEditingView(null);
    setMode('list');
  }

  if (mode === 'list') {
    return <ViewListPanel onCreate={handleCreate} onEdit={handleEdit} />;
  }

  return (
    <ViewStudio
      view={editingView}
      onBack={handleBack}
    />
  );
}
