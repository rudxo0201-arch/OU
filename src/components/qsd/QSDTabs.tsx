'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'Q' | 'S';

const PLACEHOLDERS: Record<Tab, string> = {
  Q: '무엇이든 말하면 자동으로 기록됩니다',
  S: '기록된 데이터를 검색해보세요',
};

const TAB_LABELS: Record<Tab, string> = {
  Q: '기록',
  S: '검색',
};

interface QSDTabsProps {
  /** 튜토리얼용 data-tutorial-target 전달 */
  'data-tutorial-target'?: string;
}

export function QSDTabs({ 'data-tutorial-target': tutorialTarget }: QSDTabsProps) {
  const [tab, setTab] = useState<Tab>('Q');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved' | 'searching' | 'error'>('idle');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // 탭 전환 시 입력창 포커스 + 상태 초기화
  useEffect(() => {
    setInput('');
    setStatus('idle');
    setSearchResult(null);
    inputRef.current?.focus();
  }, [tab]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    if (tab === 'Q') {
      setInput('');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
      // 백그라운드 저장 (사용자는 기다리지 않음)
      fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).catch(() => {});
    }

    if (tab === 'S') {
      setStatus('searching');
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, mode: 'hybrid' }),
        });
        const data = await res.json();
        setSearchResult({ query: text, nodes: data.results ?? [], viewHint: null });
        setStatus('idle');
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2000);
      }
    }

  }, [tab, input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setSearchResult(null);
      setStatus('idle');
    }
  }, [handleSubmit]);

  return (
    <div
      data-tutorial-target={tutorialTarget}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
    >
      <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
        {/* 탭 헤더 */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 0, paddingLeft: 4 }}>
          {(['Q', 'S'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 14px',
                borderRadius: 'var(--ou-radius-sm) var(--ou-radius-sm) 0 0',
                border: 'none',
                background: tab === t ? 'var(--ou-bg)' : 'transparent',
                boxShadow: tab === t ? 'var(--ou-neu-raised-xs)' : 'none',
                color: tab === t ? 'var(--ou-text-strong)' : 'var(--ou-text-disabled)',
                fontSize: 12,
                fontWeight: tab === t ? 600 : 400,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 150ms ease',
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* 입력창 */}
        <div
          className="widget-no-drag"
          style={{
            background: 'var(--ou-bg)',
            borderRadius: '0 var(--ou-radius-lg) var(--ou-radius-lg) var(--ou-radius-lg)',
            boxShadow: 'var(--ou-neu-pressed-md)',
            padding: '14px 18px 10px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <input
            ref={inputRef}
            className="widget-no-drag"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[tab]}
            style={{
              width: '100%', border: 'none', outline: 'none',
              background: 'transparent',
              color: 'var(--ou-text-strong)',
              fontSize: 15, fontFamily: 'inherit',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', paddingTop: 8, gap: 6 }}>
            {/* 상태 표시 */}
            <span style={{
              fontSize: 11, color: status === 'saved' ? 'var(--ou-text-muted)' : status === 'error' ? 'var(--ou-text-disabled)' : 'transparent',
              transition: 'color 200ms ease',
              fontFamily: 'var(--ou-font-mono)',
            }}>
              {status === 'saved' && '기록됨'}
              {status === 'searching' && '검색 중...'}
              {status === 'error' && '오류'}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', fontFamily: 'var(--ou-font-mono)' }}>
              ⌘K
            </span>
          </div>
        </div>

        {/* S탭 검색 결과 오버레이 */}
        {searchResult && (
          <SearchOverlay
            result={searchResult}
            onClose={() => setSearchResult(null)}
          />
        )}
      </div>
    </div>
  );
}

interface SearchResult {
  query: string;
  nodes: Array<{ id: string; raw: string; domain: string; created_at: string; similarity?: number }>;
  viewHint: string | null;
}

function SearchOverlay({ result, onClose }: { result: SearchResult; onClose: () => void }) {
  const router = useRouter();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        animation: 'ou-fade-in 150ms ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '90vw',
        maxWidth: 680,
        maxHeight: '70vh',
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-xl)',
        boxShadow: 'var(--ou-neu-raised-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'ou-slide-up 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--ou-border-faint)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--ou-text-muted)', flex: 1 }}>
            &ldquo;{result.query}&rdquo; — {result.nodes.length}개 결과
          </span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--ou-text-disabled)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* 결과 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {result.nodes.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ou-text-disabled)', fontSize: 13 }}>
              결과가 없어요
            </div>
          ) : (
            result.nodes.map(node => (
              <div key={node.id} style={{
                padding: '10px 12px',
                borderRadius: 'var(--ou-radius-md)',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-xs)',
                marginBottom: 8,
              }}>
                <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginBottom: 4, fontFamily: 'var(--ou-font-mono)' }}>
                  {node.domain}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ou-text-strong)', lineHeight: 1.5 }}>
                  {node.raw?.slice(0, 120)}{(node.raw?.length ?? 0) > 120 ? '...' : ''}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 액션 버튼 */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ou-border-faint)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => router.push('/view-studio')}
            style={{
              padding: '7px 16px', borderRadius: 'var(--ou-radius-pill)',
              border: 'none', background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-xs)',
              color: 'var(--ou-text-muted)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            수정하기
          </button>
          <button
            onClick={() => { /* TODO: Go to Home — 위젯 추가 */ onClose(); }}
            style={{
              padding: '7px 16px', borderRadius: 'var(--ou-radius-pill)',
              border: 'none', background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-sm)',
              color: 'var(--ou-text-strong)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
