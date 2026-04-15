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

  return (
    <Box p="xl" maw={720} mx="auto">
      <Stack gap="lg">
        {/* Search input */}
        <form onSubmit={handleSubmit}>
          <TextInput
            ref={inputRef}
            size="lg"
            placeholder="검색어를 입력하세요..."
            value={query}
            onChange={e => setQuery(e.currentTarget.value)}
            leftSection={<MagnifyingGlass size={20} />}
            rightSection={
              loading ? (
                <Loader size={16} />
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
                  <X size={14} />
                </ActionIcon>
              ) : (
                <Kbd size="xs">Enter</Kbd>
              )
            }
            styles={{
              input: {
                background: 'var(--mantine-color-body)',
                border: '0.5px solid var(--mantine-color-default-border)',
              },
            }}
          />
        </form>

        {/* Search mode selector */}
        <Group gap="xs">
          {modes.map(m => (
            <Badge
              key={m.value}
              variant={mode === m.value ? 'filled' : 'outline'}
              color={mode === m.value ? 'dark' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setMode(m.value);
                if (query.trim()) performSearch(query, m.value);
              }}
            >
              {m.label}
            </Badge>
          ))}
        </Group>

        {/* Recent searches */}
        {!searched && recentSearches.length > 0 && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts={1}>
                최근 검색
              </Text>
              <Text
                fz="xs"
                c="dimmed"
                style={{ cursor: 'pointer' }}
                onClick={handleClearRecent}
              >
                지우기
              </Text>
            </Group>
            {recentSearches.map((q, i) => (
              <Paper
                key={i}
                p="xs"
                radius="md"
                style={{
                  cursor: 'pointer',
                  border: '0.5px solid var(--mantine-color-default-border)',
                }}
                onClick={() => handleRecentClick(q)}
              >
                <Group gap="xs">
                  <Clock size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  <Text fz="sm">{q}</Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Results */}
        {searched && !loading && results.length === 0 && (
          <Stack align="center" py="xl" gap="xs">
            <MagnifyingGlass size={40} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text c="dimmed" fz="sm">
              &ldquo;{query}&rdquo;에 대한 결과가 없습니다
            </Text>
          </Stack>
        )}

        {searched && !loading && results.length > 0 && (
          <Stack gap="md">
            <Text fz="xs" c="dimmed">
              {results.length}건의 결과
            </Text>

            {Object.entries(groupedResults).map(([domain, items]) => (
              <Stack key={domain} gap="xs">
                <Group gap="xs">
                  <Badge variant="light" color="gray" size="sm">
                    {domain}
                  </Badge>
                  <Text fz="xs" c="dimmed">{items.length}건</Text>
                </Group>

                {items.map((result, idx) => {
                  const nodeId = result.id;
                  const rawPreview = (result.raw ?? '').slice(0, 120);
                  const date = result.created_at
                    ? new Date(result.created_at).toLocaleDateString('ko-KR')
                    : '';

                  return (
                    <Paper
                      key={nodeId ?? idx}
                      p="sm"
                      radius="md"
                      style={{
                        cursor: 'pointer',
                        border: '0.5px solid var(--mantine-color-default-border)',
                        transition: 'background 150ms ease',
                      }}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background =
                          'var(--mantine-color-default-hover)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = '';
                      }}
                    >
                      <Stack gap={4}>
                        <Text fz="sm" lineClamp={2}>
                          {rawPreview || '(내용 없음)'}
                          {(result.raw ?? '').length > 120 && '...'}
                        </Text>

                        <Group gap="xs">
                          {date && (
                            <Text fz="xs" c="dimmed">{date}</Text>
                          )}
                          {result.confidence && (
                            <>
                              <Divider orientation="vertical" />
                              <Text fz="xs" c="dimmed">{result.confidence}</Text>
                            </>
                          )}
                          {result.similarity != null && (
                            <>
                              <Divider orientation="vertical" />
                              <Text fz="xs" c="dimmed">
                                유사도 {Math.round(result.similarity * 100)}%
                              </Text>
                            </>
                          )}
                          <Box style={{ flex: 1 }} />
                          <ArrowRight
                            size={14}
                            style={{ color: 'var(--mantine-color-dimmed)' }}
                          />
                        </Group>
                      </Stack>
                    </Paper>
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
