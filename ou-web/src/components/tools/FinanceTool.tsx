'use client';

import { useState } from 'react';
import { CurrencyCircleDollar, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const CATEGORIES = ['식비', '교통', '쇼핑', '문화', '의료', '교육', '기타'];

function parseFinance(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  const amountMatch = input.match(/(\d[\d,]*)\s*(원|만원)/);
  if (amountMatch) {
    const num = amountMatch[1].replace(/,/g, '');
    const unit = amountMatch[2] === '만원' ? 10000 : 1;
    parsed.amount = (parseInt(num) * unit).toLocaleString() + '원';
  }

  const itemMatch = input.replace(/(\d[\d,]*\s*(원|만원))/, '').replace(/(오늘|어제|점심|저녁|아침)/, '').trim();
  if (itemMatch.length > 1) {
    parsed.item = itemMatch;
  }

  return parsed;
}

export function FinanceTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div
      style={{
        marginTop: 8,
        border: '0.5px solid var(--color-default-border)',
        borderRadius: 8,
        overflow: 'hidden',
        animation: 'ou-fade-in 300ms ease',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--color-default-border)' }}
      >
        <CurrencyCircleDollar size={14} weight="fill" />
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>지출</span>
        {selectedCategory && <Check size={12} style={{ color: '#22c55e' }} />}
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {parsed.amount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>금액</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{parsed.amount}</span>
            </div>
          )}
          {parsed.item && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>항목</span>
              <span style={{ fontSize: 14 }}>{parsed.item}</span>
            </div>
          )}
          {selectedCategory && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>카테고리</span>
              <span style={{ fontSize: 14 }}>{selectedCategory}</span>
            </div>
          )}
        </div>
      </div>

      {!selectedCategory && (
        <div style={{ padding: '0 12px 8px' }}>
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>카테고리</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  onSubmit(`카테고리: ${cat}`);
                }}
                style={{
                  padding: '2px 10px',
                  borderRadius: 14,
                  fontSize: 11,
                  border: '0.5px solid var(--color-default-border)',
                  color: 'var(--color-dimmed)',
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderTop: '0.5px solid var(--color-default-border)' }}
      >
        <button
          onClick={() => router.push('/my')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-dimmed)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          내 우주에서 보기 <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

registerTool({
  id: 'finance',
  label: '지출',
  match: (_input, domain) => domain === 'finance',
  parse: parseFinance,
  component: FinanceTool,
});
