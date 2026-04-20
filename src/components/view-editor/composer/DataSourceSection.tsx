'use client';
import { useEffect, useState } from 'react';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { ComposerSection } from './ComposerSection';

const DOMAIN_ICONS: Record<string, string> = {
  task:      '✓',
  schedule:  '◷',
  finance:   '₩',
  habit:     '◈',
  emotion:   '♡',
  knowledge: '◎',
  boncho:    '⚕',
  hanja:     '漢',
  bangje:    '◉',
  idea:      '✦',
  media:     '▶',
  education: '◆',
};

const DOMAIN_LABELS: Record<string, string> = {
  task:      '할일',
  schedule:  '일정',
  finance:   '재정',
  habit:     '습관',
  emotion:   '감정',
  knowledge: '지식',
  boncho:    '본초',
  hanja:     '한자',
  bangje:    '방제',
  idea:      '아이디어',
  media:     '미디어',
  education: '교육',
};

interface DomainItem {
  key: string;
  count: number;
}

export function DataSourceSection() {
  const { domain, setDomain } = useViewEditorStore();
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nodes?domains=true')
      .then(r => r.json())
      .then(data => setDomains(data.domains ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ComposerSection number={1} title="데이터 소스">
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', margin: 0 }}>불러오는 중…</p>
      ) : domains.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ou-text-disabled)', margin: 0 }}>데이터가 없습니다</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {domains.map(d => (
            <button
              key={d.key}
              onClick={() => setDomain(domain === d.key ? '' : d.key)}
              style={{
                padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'var(--ou-bg)',
                boxShadow: domain === d.key ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>
                {DOMAIN_ICONS[d.key] ?? '◦'}
              </span>
              <span style={{
                fontSize: 12, fontWeight: domain === d.key ? 600 : 400,
                color: domain === d.key ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
              }}>
                {DOMAIN_LABELS[d.key] ?? d.key}
              </span>
              <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)' }}>
                {d.count}개
              </span>
            </button>
          ))}
        </div>
      )}
    </ComposerSection>
  );
}
