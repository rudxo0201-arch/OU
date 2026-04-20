'use client';

import { ViewEditorPanel } from '@/components/view-editor/ViewEditorPanel';

export default function ViewStudioPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ou-bg)', padding: '168px 116px 0' }}>
      <ViewEditorPanel />
    </div>
  );
}
