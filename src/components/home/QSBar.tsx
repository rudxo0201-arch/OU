'use client';

import { CSSProperties, FormEvent, useState } from 'react';
import { GlassTabs, useToast } from '@/components/ds';

type QSTab = 'Q' | 'S';

const PLACEHOLDERS: Record<QSTab, string> = {
  Q: '오늘 뭐했어... 어디 갔어... 뭐 먹었어...',
  S: '내 데이터에서 검색...',
};

export function QSBar() {
  const [tab, setTab] = useState<QSTab>('Q');
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    const text = value.trim();
    setLoading(true);
    setValue('');

    try {
      if (tab === 'Q') {
        const res = await fetch('/api/quick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error('Quick 입력 실패');
        show('기록됨', 'success');
      } else {
        // S(Search) — TODO: /api/search 연결 후 오버레이로 결과 표시
        show('검색 기능은 준비 중입니다.', 'info');
      }
    } catch (err) {
      show('오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 16px',
    height: 52,
    background: focused ? 'rgba(255,255,255,0.07)' : 'var(--ou-glass)',
    backdropFilter: 'var(--ou-blur)',
    WebkitBackdropFilter: 'var(--ou-blur)',
    border: `1px solid ${focused ? 'var(--ou-glass-border-focus)' : 'var(--ou-glass-border)'}`,
    borderRadius: 'var(--ou-radius-pill)',
    boxShadow: focused ? `0 0 0 3px rgba(var(--ou-accent-rgb), 0.08)` : 'var(--ou-shadow-sm)',
    transition: 'all var(--ou-transition-fast)',
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 720 }}>
      <div style={containerStyle}>
        {/* QS 탭 */}
        <GlassTabs
          tabs={[
            { key: 'Q', label: 'Quick' },
            { key: 'S', label: 'Search' },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as QSTab)}
          style={{ flexShrink: 0 }}
        />

        {/* 입력 */}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PLACEHOLDERS[tab]}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 'var(--ou-text-base)',
            color: 'var(--ou-text-body)',
            fontFamily: 'var(--ou-font-body)',
            minWidth: 0,
          }}
        />

        {/* 전송 버튼 / 로딩 */}
        {loading ? (
          <span className="ou-spinner" style={{ width: 18, height: 18, flexShrink: 0 }} />
        ) : value.trim() ? (
          <button
            type="submit"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--ou-accent)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#fff',
              fontSize: 14,
              transition: 'transform var(--ou-transition-fast)',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ↑
          </button>
        ) : null}
      </div>
    </form>
  );
}
