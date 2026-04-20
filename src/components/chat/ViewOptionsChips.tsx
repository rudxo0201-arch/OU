'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { NeuButton } from '@/components/ds';

const VIEW_CHIP_LABELS: Record<string, string> = {
  calendar: '캘린더',
  todo: '할 일',
  chart: '차트',
  timeline: '타임라인',
  table: '표',
  heatmap: '히트맵',
  journal: '일기',
  flashcard: '플래시카드',
  boncho: '본초',
  dictionary: '사전',
  idea: '아이디어',
};

export function ViewOptionsChips() {
  const { pendingViewOptions, clearPendingViewOptions, addRequestedView } = useChatStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [pendingViewOptions]);

  const toggle = useCallback((vt: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(vt)) next.delete(vt);
      else next.add(vt);
      return next;
    });
  }, []);

  const confirm = useCallback(() => {
    if (!pendingViewOptions) return;
    selected.forEach(vt => {
      addRequestedView({
        viewType: vt,
        filter: pendingViewOptions.filter,
        cards: vt === 'flashcard' ? pendingViewOptions.cards : undefined,
      });
    });
    clearPendingViewOptions();
  }, [pendingViewOptions, selected, addRequestedView, clearPendingViewOptions]);

  if (!pendingViewOptions) return null;

  return (
    <div
      style={{
        margin: '8px 0 4px',
        padding: '12px 14px',
        borderRadius: 'var(--ou-radius-md)',
        background: 'var(--ou-surface-faint)',
        border: '1px solid var(--ou-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
        뷰 선택
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pendingViewOptions.options.map(vt => {
          const isOn = selected.has(vt);
          return (
            <button
              key={vt}
              onClick={() => toggle(vt)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--ou-radius-sm)',
                border: isOn ? '1.5px solid var(--ou-text-heading)' : '1px solid var(--ou-border-subtle)',
                background: isOn ? 'var(--ou-surface-subtle)' : 'transparent',
                color: isOn ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              {VIEW_CHIP_LABELS[vt] || vt}
            </button>
          );
        })}
      </div>
      <NeuButton
        variant="accent"
        size="sm"
        onClick={confirm}
        disabled={selected.size === 0}
        style={{ marginTop: 4 }}
      >
        확인
      </NeuButton>
    </div>
  );
}
