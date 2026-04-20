'use client';
import { useState, useEffect } from 'react';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import type { SavedViewRow } from '@/types/admin';
import { DataSourceSection } from './composer/DataSourceSection';
import { FilterSection } from './composer/FilterSection';
import { GroupSortSection } from './composer/GroupSortSection';
import { RenderTypeSection } from './composer/RenderTypeSection';
import { OrbAssistInput } from './composer/OrbAssistInput';
import { LivePreview } from './preview/LivePreview';

interface Props {
  view: SavedViewRow | null;
  onBack: () => void;
}

export function ViewStudio({ view, onBack }: Props) {
  const store = useViewEditorStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    store.open(view ?? undefined);
    return () => store.reset();
  }, [view?.id]);

  async function handleSave() {
    if (!store.name.trim()) return;
    setSaving(true);
    const payload = store.toSavePayload();

    try {
      const method = view ? 'PATCH' : 'POST';
      const body = view
        ? JSON.stringify({ id: view.id, ...payload })
        : JSON.stringify({ name: payload.name, viewType: payload.view_type, filterConfig: payload.filter_config });

      const res = await fetch('/api/views', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => { setSaved(false); onBack(); }, 1200);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 상단 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ou-text-secondary)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <input
            value={store.name}
            onChange={e => store.setField('name', e.target.value)}
            placeholder="뷰 이름"
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 18, fontWeight: 700, color: 'var(--ou-text-bright)',
              fontFamily: 'inherit', width: 220,
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!store.name.trim() || saving}
          style={{
            padding: '9px 22px', borderRadius: 999, border: 'none',
            cursor: store.name.trim() && !saving ? 'pointer' : 'default',
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
            fontSize: 13, fontWeight: 600,
            color: saved ? 'var(--ou-accent)' : 'var(--ou-text-bright)',
            fontFamily: 'inherit',
          }}
        >
          {saving ? '저장 중…' : saved ? '저장됨 ✓' : '저장'}
        </button>
      </div>

      {/* Orb 입력 */}
      <OrbAssistInput />

      {/* 좌우 분할 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* 좌: 컴포저 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 0,
          background: 'var(--ou-bg)', borderRadius: 16,
          boxShadow: 'var(--ou-neu-raised-sm)', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 18px' }}>
            <DataSourceSection />
          </div>
          <div style={{ padding: '16px 18px', borderTop: '0.5px solid var(--ou-border-subtle)' }}>
            <FilterSection />
          </div>
          <div style={{ padding: '16px 18px', borderTop: '0.5px solid var(--ou-border-subtle)' }}>
            <GroupSortSection />
          </div>
          <div style={{ padding: '16px 18px', borderTop: '0.5px solid var(--ou-border-subtle)' }}>
            <RenderTypeSection />
          </div>
        </div>

        {/* 우: 라이브 프리뷰 */}
        <LivePreview />
      </div>
    </div>
  );
}
