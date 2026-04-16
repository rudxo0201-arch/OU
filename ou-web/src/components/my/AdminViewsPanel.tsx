'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, PencilSimple, Trash, X, Sparkle } from '@phosphor-icons/react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import type { SavedViewRow } from '@/types/admin';

interface AdminViewsPanelProps {
  views: SavedViewRow[];
  onClose: () => void;
  onViewsChange: (views: SavedViewRow[]) => void;
}

const VIEW_TYPE_LABELS: Record<string, string> = {
  calendar: '캘린더', task: '보드', knowledge_graph: '그래프', chart: '차트',
  mindmap: '마인드맵', heatmap: '히트맵', journal: '일기', timeline: '타임라인',
  flashcard: '플래시카드', dictionary: '사전', document: '문서', table: '표',
  export: '내보내기', custom: '커스텀',
};

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', task: '할 일', habit: '습관', knowledge: '지식',
  idea: '아이디어', relation: '관계', emotion: '감정', finance: '가계',
  product: '상품', broadcast: '방송', education: '교육', media: '미디어', location: '장소',
};

export function AdminViewsPanel({ views, onClose, onViewsChange }: AdminViewsPanelProps) {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [visFilter, setVisFilter] = useState<string>('');
  const [seeding, setSeeding] = useState(false);

  const openEditor = useViewEditorStore(s => s.open);

  const availableTypes = useMemo(() => {
    const types = new Set(views.map(v => v.view_type));
    return Array.from(types).map(t => ({ value: t, label: VIEW_TYPE_LABELS[t] ?? t })).sort((a, b) => a.label.localeCompare(b.label));
  }, [views]);

  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    for (const v of views) { const d = (v.filter_config as any)?.domain; if (d) domains.add(d); }
    return Array.from(domains).map(d => ({ value: d, label: DOMAIN_LABELS[d] ?? d }));
  }, [views]);

  const filteredViews = useMemo(() => {
    return views
      .filter(v => !typeFilter || v.view_type === typeFilter)
      .filter(v => !domainFilter || (v.filter_config as any)?.domain === domainFilter)
      .filter(v => !visFilter || v.visibility === visFilter)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [views, typeFilter, domainFilter, visFilter]);

  const hasDefaults = views.some(v => v.is_default);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/views/defaults', { method: 'POST' });
      if (res.ok) {
        const listRes = await fetch('/api/views');
        if (listRes.ok) { const { views: freshViews } = await listRes.json(); onViewsChange(freshViews); }
      }
    } catch { /* Silent fail */ } finally { setSeeding(false); }
  };

  const handleDelete = async (id: string) => {
    try { const res = await fetch(`/api/views?id=${id}`, { method: 'DELETE' }); if (res.ok) onViewsChange(views.filter(v => v.id !== id)); } catch { /* Silent fail */ }
  };

  const selectStyle: React.CSSProperties = { padding: '4px 8px', fontSize: 'var(--mantine-font-size-xs)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit' };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(6, 8, 16, 0.85)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', padding: 24 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 600, fontSize: 'var(--mantine-font-size-lg)' }}>데이터뷰 관리</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => openEditor()} style={{ padding: '4px 12px', fontSize: 'var(--mantine-font-size-xs)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'inherit' }}>
            <Plus size={14} /> 새 뷰
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {availableTypes.length > 1 && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...selectStyle, width: 130 }}>
            <option value="">전체 타입</option>
            {availableTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
        {availableDomains.length > 1 && (
          <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} style={{ ...selectStyle, width: 130 }}>
            <option value="">전체 도메인</option>
            {availableDomains.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        )}
        <select value={visFilter} onChange={e => setVisFilter(e.target.value)} style={{ ...selectStyle, width: 110 }}>
          <option value="">공개 상태</option>
          <option value="private">비공개</option>
          <option value="link">링크</option>
          <option value="public">공개</option>
        </select>
        <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>{filteredViews.length}개</span>
      </div>

      {/* 뷰 목록 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredViews.map(view => (
            <GlassCard key={view.id} px="md" py="sm" style={{ cursor: 'pointer' }} onClick={() => openEditor(view)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--mantine-font-size-md)' }}>{view.icon || '\u25C6'}</span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.name}</span>
                    {view.description && <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.description}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: 'var(--mantine-color-dimmed)' }}>{VIEW_TYPE_LABELS[view.view_type] ?? view.view_type}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px dotted var(--mantine-color-default-border)', color: 'var(--mantine-color-dimmed)' }}>
                    {view.visibility === 'public' ? '공개' : view.visibility === 'link' ? '링크' : '비공개'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); openEditor(view); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' }}>
                    <PencilSimple size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(view.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-red-5)' }}>
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {filteredViews.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)' }}>
              {views.length === 0 ? '아직 뷰가 없습니다' : '조건에 맞는 뷰가 없습니다'}
            </span>
            {!hasDefaults && (
              <button onClick={handleSeedDefaults} disabled={seeding} style={{ padding: '8px 16px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: seeding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'inherit' }}>
                <Sparkle size={14} /> {seeding ? '생성 중...' : '기본 뷰 생성하기'}
              </button>
            )}
          </div>
        )}
      </div>

      {views.length > 0 && !hasDefaults && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button onClick={handleSeedDefaults} disabled={seeding} style={{ padding: '4px 12px', background: 'transparent', border: 'none', cursor: seeding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-xs)' }}>
            <Sparkle size={14} /> {seeding ? '생성 중...' : '기본 뷰 추가하기'}
          </button>
        </div>
      )}
    </div>
  );
}
