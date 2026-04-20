'use client';
import { useEffect, useState } from 'react';
import type { SavedViewRow } from '@/types/admin';

interface Props {
  onCreate: () => void;
  onEdit: (view: SavedViewRow) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  task: 'var(--ou-text-secondary)',
  schedule: 'var(--ou-text-secondary)',
  finance: 'var(--ou-text-secondary)',
  habit: 'var(--ou-text-secondary)',
  emotion: 'var(--ou-text-secondary)',
  knowledge: 'var(--ou-text-secondary)',
};

export function ViewListPanel({ onCreate, onEdit }: Props) {
  const [views, setViews] = useState<SavedViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/views')
      .then(r => r.json())
      .then(data => setViews(data.views ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/views?id=${id}`, { method: 'DELETE' });
    setViews(vs => vs.filter(v => v.id !== id));
    setConfirmDelete(null);
    setDeleting(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>
          {views.length}개의 뷰
        </span>
        <button
          onClick={onCreate}
          style={{
            padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
            fontSize: 14, fontWeight: 600, color: 'var(--ou-text-bright)',
          }}
        >
          + 새 뷰
        </button>
      </div>

      {/* 뷰 목록 */}
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>불러오는 중…</p>
      ) : views.length === 0 ? (
        <div style={{
          padding: '40px 20px', borderRadius: 16, textAlign: 'center',
          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', margin: 0 }}>저장된 뷰가 없습니다</p>
          <p style={{ fontSize: 12, color: 'var(--ou-text-disabled)', margin: '8px 0 0' }}>
            새 뷰를 만들어 데이터를 원하는 방식으로 시각화하세요
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {views.map(view => {
            const fc = (view.filter_config as Record<string, unknown>) ?? {};
            const domain = (fc.domain as string) ?? '';
            const isConfirming = confirmDelete === view.id;

            return (
              <div
                key={view.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
                  cursor: 'pointer',
                }}
                onClick={() => !isConfirming && onEdit(view)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  {/* 아이콘 원 */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>
                    {view.icon || '◈'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {view.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      {domain && (
                        <span style={{
                          fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
                          color: DOMAIN_COLORS[domain] ?? 'var(--ou-text-muted)',
                        }}>
                          {domain}
                        </span>
                      )}
                      {view.view_type && (
                        <span style={{
                          fontSize: 12, color: 'var(--ou-text-muted)',
                          padding: '2px 8px', borderRadius: 999,
                          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
                        }}>
                          {view.view_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 우측 액션 */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }} onClick={e => e.stopPropagation()}>
                  {isConfirming ? (
                    <>
                      <button
                        onClick={() => handleDelete(view.id)}
                        disabled={deleting === view.id}
                        style={{
                          padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600,
                          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
                          color: 'var(--ou-accent)',
                        }}
                      >
                        {deleting === view.id ? '…' : '삭제'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{
                          padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                          fontSize: 11,
                          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
                          color: 'var(--ou-text-muted)',
                        }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(view.id)}
                      style={{
                        padding: '4px 8px', borderRadius: 999, border: 'none', cursor: 'pointer',
                        fontSize: 11, color: 'var(--ou-text-disabled)',
                        background: 'transparent',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
