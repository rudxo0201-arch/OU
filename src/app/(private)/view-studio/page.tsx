'use client';

import { ViewEditorPanel } from '@/components/view-editor/ViewEditorPanel';

export default function ViewStudioPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ou-bg)', paddingTop: 52 }}>
      <ViewEditorPanel />
    </div>
  );
}
