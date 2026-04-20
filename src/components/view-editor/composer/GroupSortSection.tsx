'use client';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { ComposerSection } from './ComposerSection';
import { DOMAIN_FIELDS } from '../lib/domainFields';

const RANGES: { key: string; label: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'today',   label: '오늘' },
  { key: 'week',    label: '이번 주' },
  { key: 'month',   label: '이번 달' },
  { key: 'quarter', label: '분기' },
  { key: 'year',    label: '올해' },
];

const selectStyle: React.CSSProperties = {
  flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', outline: 'none',
  background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
  fontSize: 13, color: 'var(--ou-text-strong)', fontFamily: 'inherit', cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--ou-text-muted)', width: 44, flexShrink: 0,
};

export function GroupSortSection() {
  const { domain, groupBy, sortField, sortDir, range, setGroupBy, setSort, setRange } = useViewEditorStore();
  const fields = domain ? (DOMAIN_FIELDS[domain] ?? []) : [];

  return (
    <ComposerSection number={3} title="그룹 · 정렬 · 기간">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 그룹 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={labelStyle}>그룹</span>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={selectStyle}>
            <option value="">없음</option>
            {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>

        {/* 정렬 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={labelStyle}>정렬</span>
          <select value={sortField} onChange={e => setSort(e.target.value, sortDir)} style={{ ...selectStyle, flex: 2 }}>
            <option value="">없음</option>
            {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <select value={sortDir} onChange={e => setSort(sortField, e.target.value as 'asc' | 'desc')} style={{ ...selectStyle, flex: 1 }}>
            <option value="asc">오름차순</option>
            <option value="desc">내림차순</option>
          </select>
        </div>

        {/* 기간 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={labelStyle}>기간</span>
          <div style={{ flex: 1, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all')}
                style={{
                  padding: '5px 11px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'var(--ou-bg)', fontFamily: 'inherit',
                  boxShadow: range === r.key ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
                  fontSize: 12,
                  color: range === r.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                  fontWeight: range === r.key ? 600 : 400,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ComposerSection>
  );
}
