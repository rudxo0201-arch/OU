'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ds';
import { useQuickImageUpload } from '@/hooks/useQuickImageUpload';
import { ImagePreviewModal } from '@/components/quick/ImagePreviewModal';
import type { ImagePreviewData } from '@/hooks/useQuickImageUpload';
import { SearchPanel } from './SearchPanel';
import type { SearchResult } from './SearchPanel';

type QSTab = 'Q' | 'S';

const PLACEHOLDERS: Record<QSTab, string> = {
  Q: 'Just talk.',
  S: 'Search your universe.',
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { show } = useToast();

  const { inputRef, triggerUpload, handleInputChange, isUploading, isDragOver, bindDropZone, bindPaste } =
    useQuickImageUpload({
      onPreviewReady: (data) => setPreview(data),
      onError: (msg) => show(msg, 'error'),
    });

  // 탭 전환 시 검색 초기화
  useEffect(() => {
    if (tab === 'Q') { setSearchOpen(false); setSearchResults([]); }
    textareaRef.current?.focus();
  }, [tab]);

  // S탭 debounce 검색
  useEffect(() => {
    if (tab !== 'S' || !value.trim()) { setSearchOpen(false); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true); setSearchOpen(true);
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
      if (domain) window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));
      show(title ? `${LABEL[domain!] ?? '기록'} — ${title}` : '기록됨', 'success', {
        duration: 4000,
        action: nodeId ? { label: '취소', onClick: () => fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' }).catch(() => {}) } : undefined,
      });
    } catch { show('오류가 발생했습니다.', 'error'); }
    finally { setLoading(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  const isQ = tab === 'Q';

  return (
    <>
      {tab === 'S' && searchOpen && (
        <SearchPanel
          query={value}
          results={searchResults}
          loading={searchLoading}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />

      {preview && (
        <ImagePreviewModal
          ocrText={preview.ocrText}
          onClose={() => setPreview(null)}
          onSaved={(nodeId, domain) => {
            setPreview(null);
            const LABEL: Record<string, string> = { schedule: '일정', task: '할 일', finance: '지출', habit: '습관' };
            show(`${LABEL[domain ?? ''] ?? '기록'}에 기록됨`, 'success', {
              duration: 4000,
              action: nodeId ? { label: '취소', onClick: () => fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' }).catch(() => {}) } : undefined,
            });
            if (domain) window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));
          }}
        />
      )}

      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: 680 }}
        {...(isQ ? { ...bindDropZone, ...bindPaste } : {})}
      >
        <div style={{
          background: '#fff',
          border: `1px solid ${isDragOver ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 16,
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'border-color 150ms ease',
        }}>
          {/* 텍스트 입력 영역 */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[tab]}
            disabled={loading || isUploading}
            rows={3}
            style={{
              flex: 1,
              resize: 'none',
              border: 'none',
              outline: 'none',
              padding: '14px 16px 8px',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(0,0,0,0.82)',
              fontFamily: 'var(--ou-font-body)',
              background: 'transparent',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />

          {/* 하단 툴바 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 10px 10px',
            gap: 8,
          }}>
            {/* 이미지 업로드 버튼 (Q 탭만) */}
            {isQ && (
              <button
                type="button"
                onClick={triggerUpload}
                title="이미지 업로드"
                style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(0,0,0,0.35)',
                  fontSize: 14,
                  flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >⌃</button>
            )}

            <div style={{ flex: 1 }} />

            {/* 모드 토글 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: 8,
              padding: 2,
              gap: 1,
            }}>
              {(['Q', 'S'] as QSTab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: tab === t ? '#fff' : 'transparent',
                    boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    color: tab === t ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.38)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    fontFamily: 'var(--ou-font-body)',
                  }}
                >
                  {t === 'Q' ? 'Quick' : 'Search'}
                </button>
              ))}
            </div>

            {/* 전송 버튼 */}
            {(loading || isUploading) ? (
              <span className="ou-spinner" style={{ width: 18, height: 18, flexShrink: 0 }} />
            ) : (
              <button
                type="submit"
                disabled={!value.trim()}
                style={{
                  width: 32, height: 32,
                  borderRadius: 10,
                  background: value.trim() ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.08)',
                  border: 'none',
                  cursor: value.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: value.trim() ? '#fff' : 'rgba(0,0,0,0.25)',
                  fontSize: 15,
                  transition: 'all 150ms ease',
                  flexShrink: 0,
                }}
                onMouseDown={e => { if (value.trim()) e.currentTarget.style.transform = 'scale(0.88)'; }}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >↑</button>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
