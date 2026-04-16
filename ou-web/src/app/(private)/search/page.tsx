'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, TextInput, Stack, Text, Group, Badge, Loader,
  Paper, ActionIcon, Kbd, Divider,
} from '@mantine/core';
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
  });

  return (
    <Box p="xl" maw={720} mx="auto">
      <Stack gap="lg">
        {/* Section title */}
        <Text
          fz={10}
          fw={500}
          style={{
            color: 'var(--ou-text-heading)',
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          SEARCH
        </Text>

        {/* Search input — input-block style */}
        <form onSubmit={handleSubmit}>
          <TextInput
            ref={inputRef}
            size="lg"
            placeholder="검색어를 입력하세요..."
            value={query}
            onChange={e => setQuery(e.currentTarget.value)}
            leftSection={<MagnifyingGlass size={20} style={{ color: 'var(--ou-text-dimmed)' }} />}
            rightSection={
              loading ? (
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
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setSearched(false);
                    inputRef.current?.focus();
                  }}
                >
                  <X size={14} style={{ color: 'var(--ou-text-dimmed)' }} />
                </ActionIcon>
              ) : (
                <Kbd size="xs" style={{ background: 'var(--ou-surface-subtle)', border: '0.5px solid var(--ou-border-faint)', color: 'var(--ou-text-dimmed)' }}>Enter</Kbd>
              )
            }
            styles={{
              input: {
                background: 'transparent',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-body)',
                boxShadow: 'var(--ou-glow-sm)',
                transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
              },
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
        </form>

        {/* Search mode selector — pill-block toggles */}
        <Group gap="xs">
          {modes.map(m => (
            <div
              key={m.value}
              style={modeStyle(mode === m.value)}
              onClick={() => {
                setMode(m.value);
                if (query.trim()) performSearch(query, m.value);
              }}
            >
              {m.label}
            </div>
          ))}
        </Group>

        {/* Recent searches — badge-block chips */}
        {!searched && recentSearches.length > 0 && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text
                fz={10}
                fw={500}
                style={{
                  color: 'var(--ou-text-heading)',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                }}
              >
                RECENT
              </Text>
              <Text
                fz="xs"
                style={{ cursor: 'pointer', color: 'var(--ou-text-dimmed)' }}
                onClick={handleClearRecent}
              >
                지우기
              </Text>
            </Group>
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
                <Group gap="xs">
                  <Clock size={14} style={{ color: 'var(--ou-text-dimmed)' }} />
                  <Text fz="sm" style={{ color: 'var(--ou-text-body)' }}>{q}</Text>
                </Group>
              </div>
            ))}
          </Stack>
        )}

        {/* Results — empty state */}
        {searched && !loading && results.length === 0 && (
          <Stack align="center" py="xl" gap="xs">
            <MagnifyingGlass size={40} style={{ color: 'var(--ou-text-dimmed)' }} />
            <Text fz="sm" style={{ color: 'var(--ou-text-dimmed)' }}>
              &ldquo;{query}&rdquo;에 대한 결과가 없습니다
            </Text>
          </Stack>
        )}

        {/* Results — card-block items */}
        {searched && !loading && results.length > 0 && (
          <Stack gap="md">
            <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>
              {results.length}건의 결과
            </Text>

            {Object.entries(groupedResults).map(([domain, items]) => (
              <Stack key={domain} gap="xs">
                <Group gap="xs">
                  {/* badge-block */}
                  <Text
                    fz={10}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--ou-radius-pill)',
                      border: '0.5px solid var(--ou-border-subtle)',
                      color: 'var(--ou-text-dimmed)',
                      background: 'transparent',
                    }}
                  >
                    {domain}
                  </Text>
                  <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>{items.length}건</Text>
                </Group>

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
                      <Stack gap={4}>
                        <Text fz="sm" lineClamp={2} style={{ color: 'var(--ou-text-body)' }}>
                          {rawPreview || '(내용 없음)'}
                          {(result.raw ?? '').length > 120 && '...'}
                        </Text>

                        <Group gap="xs">
                          {date && (
                            <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>{date}</Text>
                          )}
                          {result.confidence && (
                            <>
                              <Divider orientation="vertical" style={{ borderColor: 'var(--ou-border-faint)' }} />
                              <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>{result.confidence}</Text>
                            </>
                          )}
                          {result.similarity != null && (
                            <>
                              <Divider orientation="vertical" style={{ borderColor: 'var(--ou-border-faint)' }} />
                              <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>
                                유사도 {Math.round(result.similarity * 100)}%
                              </Text>
                            </>
                          )}
                          <Box style={{ flex: 1 }} />
                          <ArrowRight
                            size={14}
                            style={{ color: 'var(--ou-text-dimmed)' }}
                          />
                        </Group>
                      </Stack>
                    </div>
                  );
                })}
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
