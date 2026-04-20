'use client';
import { useViewEditorStore } from '@/stores/viewEditorStore';

const RENDER_LABELS: Record<string, string> = {
  task: '칸반', todo: '리스트', calendar: '캘린더', timeline: '타임라인',
  table: '테이블', heatmap: '히트맵', chart: '차트', journal: '일기',
};

const RANGE_LABELS: Record<string, string> = {
  today: '오늘', week: '이번 주', month: '이번 달',
  quarter: '분기', year: '올해', all: '전체',
};

const DOMAIN_LABELS: Record<string, string> = {
  task: '할일', schedule: '일정', finance: '재정',
  habit: '습관', emotion: '감정', knowledge: '지식',
};

export function RecipePillStrip() {
  const { domain, viewType, filterRules, groupBy, sortField, sortDir, range } = useViewEditorStore();

  const pills: { label: string; value: string }[] = [];
  if (domain) pills.push({ label: '소스', value: DOMAIN_LABELS[domain] ?? domain });
  if (viewType) pills.push({ label: '렌더', value: RENDER_LABELS[viewType] ?? viewType });
  if (range && range !== 'all') pills.push({ label: '기간', value: RANGE_LABELS[range] ?? range });
  if (groupBy) pills.push({ label: '그룹', value: groupBy });
  if (sortField) pills.push({ label: '정렬', value: `${sortField} ${sortDir === 'asc' ? '↑' : '↓'}` });
  filterRules.forEach((r, i) => {
    if (r.field) pills.push({ label: `조건${i + 1}`, value: `${r.field} ${r.op} ${r.value}` });
  });

  if (pills.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--ou-text-disabled)', margin: 0, textAlign: 'center' }}>
        좌측에서 설정하면 여기에 반영돼요
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {pills.map((p, i) => (
        <div
          key={i}
          style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
            fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ color: 'var(--ou-text-dimmed)' }}>{p.label}</span>
          <span style={{ color: 'var(--ou-text-strong)', fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
