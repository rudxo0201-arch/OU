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
  Q: '그냥 말해봐.',
  S: '내 기억에서 찾아봐.',
};

export function QSBar() {
  const [tab, setTab] = useState<QSTab>('Q');
  const [value, setValue] = useState('');
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

  // 탭 전환 시 검색 초기화
  useEffect(() => {
    if (tab === 'Q') { setSearchOpen(false); setSearchResults([]); }
  }, [tab]);

  // S탭 debounce 검색
  useEffect(() => {
    if (tab !== 'S' || !value.trim()) { setSearchOpen(false); return; }
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
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [tab, value]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const text = value.trim();

    if (tab === 'S') {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      setSearchLoading(true); setSearchOpen(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, mode: 'hybrid' }),
        });
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
      return;
    }

    if (loading) return;
    setLoading(true); setValue('');
    try {
      const res = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const { nodeId, domain, title } = data as { nodeId?: string; domain?: string; title?: string };
      const LABEL: Record<string, string> = {
        schedule: '일정', task: '할 일', finance: '지출',
        habit: '습관', note: '노트', idea: '아이디어', knowledge: '지식', media: '미디어',
      };
      const label = domain ? (LABEL[domain] ?? domain) : '기록';
      if (domain) window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));
      show(title ? `${label}에 기록 — ${title}` : `${label}에 기록됨`, 'success', {
        duration: 4000,
        action: nodeId ? { label: '취소', onClick: () => fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' }).catch(() => {}) } : undefined,
      });
    } catch { show('오류가 발생했습니다.', 'error'); }
    finally { setLoading(false); }
  }

  // ── 디자인 토큰 ───────────────────────────────────────────────────────────
  const isQ = tab === 'Q';
  const borderColor = 'rgba(0,0,0,0.88)';
  const tabW = 38;
  const barH = 52;
  const radius = 14;

  const sideTabStyle = (active: boolean, side: 'left' | 'right'): CSSProperties => ({
    width: tabW,
    height: '100%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? borderColor : 'transparent',
    borderRadius: side === 'left'
      ? `${radius}px 0 0 ${radius}px`
      : `0 ${radius}px ${radius}px 0`,
    cursor: 'pointer',
    border: 'none',
    transition: 'background 200ms ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  });

  const sideLabelStyle = (active: boolean): CSSProperties => ({
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: active ? '#fff' : 'rgba(0,0,0,0.28)',
    fontFamily: 'var(--ou-font-body)',
    transition: 'color 200ms ease',
    lineHeight: 1,
  });

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
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />

      {/* 이미지 프리뷰 모달 */}
      {preview && (
        <ImagePreviewModal
          ocrText={preview.ocrText}
          onClose={() => setPreview(null)}
          onSaved={(nodeId, domain) => {
            setPreview(null);
            const LABEL: Record<string, string> = { schedule: '일정', task: '할 일', finance: '지출', habit: '습관', knowledge: '지식', media: '미디어' };
            const label = domain ? (LABEL[domain] ?? domain) : '기록';
            show(`${label}에 기록됨`, 'success', {
              duration: 4000,
              action: nodeId ? { label: '취소', onClick: () => fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' }).catch(() => {}) } : undefined,
            });
            if (domain) window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));
          }}
        />
      )}

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 680 }}>
        {/* 외부 컨테이너 — 테두리 + 형태 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            height: barH,
            border: `1.5px solid ${borderColor}`,
            borderRadius: radius,
            background: '#fff',
            outline: isDragOver ? `2px dashed ${borderColor}` : undefined,
            transition: 'border-color 200ms ease',
            overflow: 'hidden',
          }}
          {...(isQ ? { ...bindDropZone, ...bindPaste } : {})}
        >
          {/* ── 왼쪽 탭: Quick ── */}
          <button
            type="button"
            style={sideTabStyle(isQ, 'left')}
            onClick={() => setTab('Q')}
            title="Quick 입력"
          >
            <span style={sideLabelStyle(isQ)}>Quick</span>
          </button>

          {/* ── 구분선 ── */}
          <div style={{ width: 1, background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />

          {/* ── 입력 영역 ── */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', minWidth: 0 }}>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={PLACEHOLDERS[tab]}
              disabled={loading || isUploading}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: 'rgba(0,0,0,0.80)',
                fontFamily: 'var(--ou-font-body)',
                minWidth: 0,
              }}
            />

            {/* 이미지 업로드 (Q 탭만) */}
            {isQ && !loading && !isUploading && (
              <button
                type="button"
                onClick={triggerUpload}
                title="이미지 업로드"
                style={{
                  flexShrink: 0,
                  width: 26, height: 26,
                  borderRadius: 7,
                  background: 'transparent',
                  border: '1px solid rgba(0,0,0,0.12)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(0,0,0,0.32)',
                  fontSize: 13,
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >⌃</button>
            )}

            {/* 전송 / 스피너 */}
            {(loading || isUploading) ? (
              <span className="ou-spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
            ) : value.trim() ? (
              <button
                type="submit"
                style={{
                  flexShrink: 0,
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: borderColor,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  fontSize: 14,
                  transition: 'transform 100ms ease',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.88)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >↑</button>
            ) : null}
          </div>

          {/* ── 구분선 ── */}
          <div style={{ width: 1, background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />

          {/* ── 오른쪽 탭: Search ── */}
          <button
            type="button"
            style={sideTabStyle(!isQ, 'right')}
            onClick={() => setTab('S')}
            title="내 데이터 검색"
          >
            <span style={sideLabelStyle(!isQ)}>Search</span>
          </button>
        </div>
      </form>
    </>
  );
}
