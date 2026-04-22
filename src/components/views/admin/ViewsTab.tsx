'use client';

import { useState, useEffect } from 'react';
import { GlassButton } from '@/components/ds';

interface SavedView {
  id: string;
  name: string;
  view_type: string;
  created_at?: string;
}

export function ViewsTab() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchViews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/views');
      const data = await res.json();
      setViews(data.views || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchViews(); }, []);

  const deleteView = async (id: string) => {
    if (!window.confirm('이 뷰를 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      await fetch('/api/views', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setViews(prev => prev.filter(v => v.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
          {loading ? '로딩 중...' : `${views.length}개 뷰`}
        </span>
        <GlassButton variant="ghost" size="sm" onClick={fetchViews}>새로고침</GlassButton>
      </div>

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {views.map(v => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid var(--ou-glass-border)',
              background: 'var(--ou-glass)',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-heading)' }}>{v.name}</div>
                <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 2 }}>
                  {v.view_type}
                  {v.created_at && ` · ${new Date(v.created_at).toLocaleDateString('ko-KR')}`}
                </div>
              </div>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={() => deleteView(v.id)}
                disabled={deleting === v.id}
              >
                {deleting === v.id ? '...' : '삭제'}
              </GlassButton>
            </div>
          ))}
          {views.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ou-text-muted)', fontSize: 13 }}>
              저장된 뷰가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
