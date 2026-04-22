'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PanelContent } from './types';

const NoteView = dynamic(
  () => import('@/components/views/NoteView').then(m => m.NoteView),
  { ssr: false },
);

interface Props {
  noteId?: string;
  onNavigate?: (content: PanelContent) => void;
}

export function NotePanel({ noteId, onNavigate }: Props) {
  const [node, setNode]       = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!noteId) return;
    setNode(null);
    setError('');
    setLoading(true);
    fetch(`/api/notes/${noteId}`)
      .then(r => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(data => { setNode(data.note); })
      .catch(e => { setError(e.message || '로드 실패'); })
      .finally(() => setLoading(false));
  }, [noteId]);

  if (!noteId) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        color: 'var(--ou-text-disabled)', padding: 32,
      }}>
        <span style={{ fontSize: 36, opacity: 0.2 }}>✎</span>
        <div style={{ fontSize: 13, textAlign: 'center' }}>
          사이드바에서 노트를 선택하거나<br />새 노트를 만드세요
        </div>
        <a
          href="/note/new"
          style={{
            marginTop: 8, padding: '8px 20px',
            fontSize: 13, fontWeight: 600,
            background: 'var(--ou-glass)', border: '1px solid var(--ou-glass-border)',
            borderRadius: 'var(--ou-radius-sm)',
            color: 'var(--ou-text-body)', textDecoration: 'none',
          }}
        >
          + 새 노트
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ou-text-disabled)', opacity: 0.4 }} />
      </div>
    );
  }

  if (error || !node) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ou-text-disabled)', fontSize: 13,
      }}>
        노트를 불러올 수 없습니다
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <NoteView nodes={[node as any]} />;
}
