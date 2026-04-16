'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlass, X, Clock, ArrowRight,
} from '@phosphor-icons/react';

interface SearchResult {
  id: string;
  domain: string;
  raw: string;
  created_at: string;
  confidence?: string;
  similarity?: number;
}

type SearchMode = 'hybrid' | 'keyword' | 'semantic';

const RECENT_SEARCHES_KEY = 'ou-recent-searches';
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentSearches().filter(s => s !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch { /* ignore */ }
}

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
    setRecentSearches(getRecentSearches());
  }, []);

  const performSearch = useCallback(async (searchQuery: string, searchMode: SearchMode) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);
    saveRecentSearch(trimmed);
    setRecentSearches(getRecentSearches());

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, mode: searchMode }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, mode);
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
    performSearch(q, mode);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleResultClick = (result: SearchResult) => {
    const nodeId = result.id;
    if (nodeId) {
      router.push(`/view/${nodeId}`);
    }
  };

  // Group results by domain
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const domain = r.domain || 'unknown';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(r);
    return acc;
  }, {});

  const modes: { value: SearchMode; label: string }[] = [
    { value: 'hybrid', label: '통합' },
    { value: 'keyword', label: '키워드' },
    { value: 'semantic', label: '의미' },
  ];

  /* pill-block toggle style for modes */
  const modeStyle = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer',
    padding: '3px 10px',
    borderRadius: 'var(--ou-radius-pill)',
    border: active ? '0.5px solid var(--ou-border-muted)' : '0.5px solid var(--ou-border-faint)',
    background: active ? 'var(--ou-surface-hover)' : 'transparent',
    boxShadow: active ? 'var(--ou-glow-xs)' : 'none',
    color: active ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    transition: 'all var(--ou-transition)',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section title */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--ou-text-heading)',
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          SEARCH
        </span>

        {/* Search input — input-block style */}
        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <MagnifyingGlass size={20} style={{ color: 'var(--ou-text-dimmed)' }} />
            </div>
            <input
              ref={inputRef}
              placeholder="검색어를 입력하세요..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-body)',
                boxShadow: 'var(--ou-glow-sm)',
                transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
                padding: '14px 48px 14px 48px',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                e.currentTarget.style.boxShadow = 'var(--ou-glow-hover)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
              }}
            />
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
              {loading ? (
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ou-text-dimmed)', animation: 'ou-dot1 1.2s infinite' }} />
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ou-text-dimmed)', animation: 'ou-dot2 1.2s infinite' }} />
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ou-text-dimmed)', animation: 'ou-dot3 1.2s infinite' }} />
                  <style>{`
                    @keyframes ou-dot1 { 0%,80%,100% { opacity: 0.2; } 40% { opacity: 1; } }
                    @keyframes ou-dot2 { 0%,80%,100% { opacity: 0.2; } 50% { opacity: 1; } }
                    @keyframes ou-dot3 { 0%,80%,100% { opacity: 0.2; } 60% { opacity: 1; } }
                  `}</style>
                </div>
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setSearched(false);
                    inputRef.current?.focus();
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <X size={14} style={{ color: 'var(--ou-text-dimmed)' }} />
                </button>
              ) : (
                <kbd style={{ background: 'var(--ou-surface-subtle)', border: '0.5px solid var(--ou-border-faint)', color: 'var(--ou-text-dimmed)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>Enter</kbd>
              )}
            </div>
          </div>
        </form>

        {/* Search mode selector — pill-block toggles */}
        <div style={{ display: 'flex', gap: 8 }}>
          {modes.map(m => (
            <button
              key={m.value}
              style={modeStyle(mode === m.value)}
              onClick={() => {
                setMode(m.value);
                if (query.trim()) performSearch(query, m.value);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Recent searches — badge-block chips */}
        {!searched && recentSearches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'var(--ou-text-heading)',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                }}
              >
                RECENT
              </span>
              <span
                style={{ fontSize: 12, cursor: 'pointer', color: 'var(--ou-text-dimmed)' }}
                onClick={handleClearRecent}
              >
                지우기
              </span>
            </div>
            {recentSearches.map((q, i) => (
              <div
                key={i}
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 'var(--ou-radius-card)',
                  boxShadow: 'var(--ou-glow-sm)',
                  transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
                }}
                onClick={() => handleRecentClick(q)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Clock size={14} style={{ color: 'var(--ou-text-dimmed)' }} />
                  <span style={{ fontSize: 14, color: 'var(--ou-text-body)' }}>{q}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results — empty state */}
        {searched && !loading && results.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 8 }}>
            <MagnifyingGlass size={40} style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={{ fontSize: 14, color: 'var(--ou-text-dimmed)' }}>
              &ldquo;{query}&rdquo;에 대한 결과가 없습니다
            </span>
          </div>
        )}

        {/* Results — card-block items */}
        {searched && !loading && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
              {results.length}건의 결과
            </span>

            {Object.entries(groupedResults).map(([domain, items]) => (
              <div key={domain} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* badge-block */}
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 'var(--ou-radius-pill)',
                      border: '0.5px solid var(--ou-border-subtle)',
                      color: 'var(--ou-text-dimmed)',
                      background: 'transparent',
                    }}
                  >
                    {domain}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{items.length}건</span>
                </div>

                {items.map((result, idx) => {
                  const nodeId = result.id;
                  const rawPreview = (result.raw ?? '').slice(0, 120);
                  const date = result.created_at
                    ? new Date(result.created_at).toLocaleDateString('ko-KR')
                    : '';

                  return (
                    <div
                      key={nodeId ?? idx}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 14px',
                        background: 'transparent',
                        border: '0.5px solid var(--ou-border-subtle)',
                        borderRadius: 'var(--ou-radius-card)',
                        boxShadow: 'var(--ou-glow-sm)',
                        transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
                      }}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{
                          fontSize: 14,
                          color: 'var(--ou-text-body)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {rawPreview || '(내용 없음)'}
                          {(result.raw ?? '').length > 120 && '...'}
                        </span>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {date && (
                            <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{date}</span>
                          )}
                          {result.confidence && (
                            <>
                              <div style={{ width: '0.5px', height: 12, background: 'var(--ou-border-faint)' }} />
                              <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{result.confidence}</span>
                            </>
                          )}
                          {result.similarity != null && (
                            <>
                              <div style={{ width: '0.5px', height: 12, background: 'var(--ou-border-faint)' }} />
                              <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                                유사도 {Math.round(result.similarity * 100)}%
                              </span>
                            </>
                          )}
                          <div style={{ flex: 1 }} />
                          <ArrowRight
                            size={14}
                            style={{ color: 'var(--ou-text-dimmed)' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
