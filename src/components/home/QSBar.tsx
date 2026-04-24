'use client';

import { CSSProperties, FormEvent, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ds';
import { useQuickImageUpload } from '@/hooks/useQuickImageUpload';
import { ImagePreviewModal } from '@/components/quick/ImagePreviewModal';
import type { ImagePreviewData } from '@/hooks/useQuickImageUpload';
import { SearchPanel } from './SearchPanel';
import type { SearchResult } from './SearchPanel';

type QSTab = 'Q' | 'S';

const PLACEHOLDERS: Record<QSTab, string> = {
  Q: '오늘 뭐했어... 어디 갔어... 뭐 먹었어...',
  S: '내 데이터에서 검색...',
};

/* ── 탭 버튼 ── */
function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const style: CSSProperties = {
    padding: '4px 12px',
    height: 30,
    borderRadius: 8,
    border: 'none',
    background: active ? 'rgba(0,0,0,0.88)' : 'transparent',
    color: active ? '#fff' : 'rgba(0,0,0,0.36)',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'all 140ms ease',
    fontFamily: 'var(--ou-font-body)',
    flexShrink: 0,
  };
  return <button type="button" style={style} onClick={onClick}>{label}</button>;
}

export function QSBar() {
  const [tab, setTab] = useState<QSTab>('Q');
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImagePreviewData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { show } = useToast();

  const { inputRef, triggerUpload, handleInputChange, bindDropZone, bindPaste, isUploading, isDragOver } =
    useQuickImageUpload({
      onPreviewReady: (data) => setPreview(data),
      onError: (msg) => show(msg, 'error'),
    });

  // 탭 전환 시 검색 상태 초기화
  useEffect(() => {
    if (tab === 'Q') {
      setSearchOpen(false);
      setSearchResults([]);
    }
  }, [tab]);

  // S탭 debounce 검색
  useEffect(() => {
    if (tab !== 'S' || !value.trim()) {
      setSearchOpen(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchOpen(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: value.trim(), mode: 'hybrid' }),
        });
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [tab, value]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const text = value.trim();

    // S탭: 즉시 검색 (입력값 유지, debounce 취소)
    if (tab === 'S') {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      setSearchLoading(true);
      setSearchOpen(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, mode: 'hybrid' }),
        });
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
      return;
    }

    // Q탭
    if (loading) return;
    setLoading(true);
    setValue('');

    try {
      const res = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Quick 입력 실패');

      const data = await res.json();
      const { nodeId, domain, title } = data as { nodeId?: string; domain?: string; title?: string };

      const DOMAIN_LABEL: Record<string, string> = {
        schedule: '일정', task: '할 일', finance: '지출',
        habit: '습관', note: '노트', idea: '아이디어',
        knowledge: '지식', media: '미디어',
      };
      const label = domain ? (DOMAIN_LABEL[domain] ?? domain) : '기록';
      const summary = title ? `${label}에 기록 — ${title}` : `${label}에 기록됨`;

      if (domain) {
        window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));
      }

      show(summary, 'success', {
        duration: 4000,
        action: nodeId ? {
          label: '취소',
          onClick: () => {
            fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' }).catch(() => {});
          },
        } : undefined,
      });
    } catch {
      show('오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 6px 0 10px',
    height: 48,
    background: 'rgba(255,255,255,1)',
    border: `1px solid ${focused ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.09)'}`,
    borderRadius: 14,
    boxShadow: focused
      ? '0 0 0 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.10)'
      : '0 1px 2px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.08)',
    transition: 'all 160ms ease',
  };

  return (
    <>
      {/* 검색 결과 패널 */}
      {tab === 'S' && searchOpen && (
        <SearchPanel
          query={value}
          results={searchResults}
          loading={searchLoading}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* 숨겨진 파일 input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {/* 이미지 프리뷰 모달 */}
      {preview && (
        <ImagePreviewModal
          ocrText={preview.ocrText}
          onClose={() => setPreview(null)}
          onSaved={(nodeId, domain) => {
            setPreview(null);
            const DOMAIN_LABEL: Record<string, string> = {
              schedule: '일정', task: '할 일', finance: '지출',
              habit: '습관', knowledge: '지식', media: '미디어',
            };
            const label = domain ? (DOMAIN_LABEL[domain] ?? domain) : '기록';
            show(`${label}에 기록됨`, 'success', {
              duration: 4000,
              action: nodeId ? {
                label: '취소',
                onClick: () => fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' }).catch(() => {}),
              } : undefined,
            });
            if (domain) window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));
          }}
        />
      )}

    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 680 }}>
      <div
        style={{
          ...containerStyle,
          outline: isDragOver ? '2px dashed rgba(0,0,0,0.3)' : containerStyle.outline,
        }}
        {...(tab === 'Q' ? { ...bindDropZone, ...bindPaste } : {})}
      >
        {/* 탭 그룹 */}
        <div style={{
          display: 'flex',
          gap: 2,
          background: 'rgba(0,0,0,0.05)',
          padding: 3,
          borderRadius: 10,
          flexShrink: 0,
        }}>
          <TabBtn label="Quick" active={tab === 'Q'} onClick={() => setTab('Q')} />
          <TabBtn label="Search" active={tab === 'S'} onClick={() => setTab('S')} />
        </div>

        {/* 구분선 */}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

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
            fontSize: 14,
            color: 'rgba(0,0,0,0.78)',
            fontFamily: 'var(--ou-font-body)',
            minWidth: 0,
          }}
        />

        {/* 이미지 첨부 버튼 (Quick 탭에서만) */}
        {tab === 'Q' && !loading && !isUploading && (
          <button
            type="button"
            onClick={triggerUpload}
            title="이미지 업로드"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.10)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'rgba(0,0,0,0.35)',
              fontSize: 14,
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ⌃
          </button>
        )}

        {/* 전송 / 로딩 */}
        {(loading || isUploading) ? (
          <span className="ou-spinner" style={{ width: 18, height: 18, flexShrink: 0, marginRight: 6 }} />
        ) : value.trim() ? (
          <button
            type="submit"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(0,0,0,0.88)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#fff',
              fontSize: 15,
              transition: 'transform 120ms ease, background 120ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.88)')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ↑
          </button>
        ) : (
          /* 힌트 키보드 */
          <div style={{
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            marginRight: 4,
            flexShrink: 0,
          }}>
            <kbd style={{
              padding: '2px 6px',
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 5,
              fontSize: 10,
              fontFamily: 'var(--ou-font-mono)',
              color: 'rgba(0,0,0,0.32)',
              lineHeight: 1.4,
            }}>
              ⌘K
            </kbd>
          </div>
        )}
      </div>
    </form>
    </>
  );
}
