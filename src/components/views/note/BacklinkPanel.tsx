'use client';

import { useEffect, useState } from 'react';
import { Link } from '@phosphor-icons/react';

type Backlink = { id: string; title: string };

export function BacklinkPanel({ noteId }: { noteId: string }) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/notes/backlinks?targetId=${noteId}`)
      .then((r) => r.json())
      .then((d) => setBacklinks(d.backlinks ?? []))
      .catch(() => {});
  }, [noteId]);

  if (backlinks.length === 0) return null;

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 24px 40px',
      }}
    >
      <div
        style={{
          borderTop: '1px solid var(--ou-border-subtle)',
          paddingTop: 24,
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ou-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: 0,
          }}
        >
          <Link size={13} />
          {backlinks.length}개 페이지에서 연결됨
          <span style={{ fontSize: 10, color: 'var(--ou-text-faint)' }}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {backlinks.map((bl) => (
              <a
                key={bl.id}
                href={`/note/${bl.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 'var(--ou-radius-sm)',
                  background: 'var(--ou-bg-alt)',
                  boxShadow: 'var(--ou-neu-raised-xs)',
                  textDecoration: 'none',
                  fontSize: 13,
                  color: 'var(--ou-text-body)',
                  transition: 'box-shadow var(--ou-transition)',
                }}
              >
                <Link size={12} style={{ color: 'var(--ou-accent)', flexShrink: 0 }} />
                {bl.title || '제목 없음'}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
