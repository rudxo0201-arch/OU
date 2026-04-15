'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Stack, Text, Box, Group, TextInput, SimpleGrid,
  Paper, Badge, ActionIcon, Drawer, Select, RangeSlider,
  Chip, ScrollArea, Pagination, Loader,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { MagnifyingGlass, X, ArrowLeft } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useLayoutStyles } from '@/hooks/useLayoutStyles';
import type { LayoutConfig } from '@/types/layout-config';

// ============================================================
// 한자 추출 (CJK Unicode 범위)
// ============================================================
// CJK Unified Ideographs + Extension A + Compatibility
const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

function extractHanjaChars(text: string): string[] {
  const matches = text.match(CJK_REGEX);
  if (!matches) return [];
  // 중복 제거하되 순서 유지
  return Array.from(new Set(matches));
}

function isHanjaQuery(text: string): boolean {
  return CJK_REGEX.test(text);
}

// ============================================================
// 필터 로직
// ============================================================
interface Filters {
  radical?: string;
  gradeMin?: number;
  gradeMax?: number;
  strokeMin?: number;
  strokeMax?: number;
  compositionType?: string;
}

function getNodeDomainData(node: any) {
  return node.domain_data || {};
}

function matchesSearch(node: any, query: string, hanjaChars: string[]): boolean {
  const d = getNodeDomainData(node);
  if (!query) return true;

  // 한자가 포함된 검색어 → 한자 매칭
  if (hanjaChars.length > 0) {
    return hanjaChars.includes(d.char);
  }

  // 한글/영문 검색 → 음, 훈, definition 매칭
  const q = query.toLowerCase();
  const ko = (d.readings?.ko || []).join(' ').toLowerCase();
  const hun = (d.readings?.ko_hun || []).join(' ').toLowerCase();
  const hangul = (d.hangul_reading || '').toLowerCase();
  const defEn = (d.definition_en || '').toLowerCase();

  return ko.includes(q) || hun.includes(q) || hangul.includes(q) || defEn.includes(q);
}

function matchesFilters(node: any, filters: Filters): boolean {
  const d = getNodeDomainData(node);

  if (filters.radical && d.radical_char !== filters.radical) return false;
  if (filters.gradeMin != null && (d.grade == null || d.grade < filters.gradeMin)) return false;
  if (filters.gradeMax != null && (d.grade == null || d.grade > filters.gradeMax)) return false;
  if (filters.strokeMin != null && d.stroke_count < filters.strokeMin) return false;
  if (filters.strokeMax != null && d.stroke_count > filters.strokeMax) return false;
  if (filters.compositionType && d.composition?.type !== filters.compositionType) return false;

  return true;
}

// ============================================================
// 사용 가능한 필터 옵션 추출 (빈 필터 숨김)
// ============================================================
function getAvailableFilters(nodes: any[]) {
  const radicals = new Map<string, number>();
  const grades = new Map<number, number>();
  const compositionTypes = new Map<string, number>();
  let minStroke = Infinity;
  let maxStroke = 0;

  for (const n of nodes) {
    const d = getNodeDomainData(n);
    if (d.radical_char) {
      radicals.set(d.radical_char, (radicals.get(d.radical_char) || 0) + 1);
    }
    if (d.grade != null) {
      grades.set(d.grade, (grades.get(d.grade) || 0) + 1);
    }
    if (d.composition?.type) {
      compositionTypes.set(d.composition.type, (compositionTypes.get(d.composition.type) || 0) + 1);
    }
    if (d.stroke_count != null) {
      minStroke = Math.min(minStroke, d.stroke_count);
      maxStroke = Math.max(maxStroke, d.stroke_count);
    }
  }

  return {
    radicals: Array.from(radicals.entries()).sort((a, b) => b[1] - a[1]),
    grades: Array.from(grades.entries()).sort((a, b) => a[0] - b[0]),
    compositionTypes: Array.from(compositionTypes.entries()).sort((a, b) => b[1] - a[1]),
    strokeRange: [minStroke === Infinity ? 1 : minStroke, maxStroke || 30] as [number, number],
  };
}

// ============================================================
// 카드 컴포넌트
// ============================================================
function HanjaCard({ node, onClick, styles }: {
  node: any;
  onClick: () => void;
  styles: ReturnType<typeof useLayoutStyles>;
}) {
  const d = getNodeDomainData(node);
  const hun = d.readings?.ko_hun?.[0] || '';
  const eum = d.readings?.ko?.[0] || d.hangul_reading || '';
  const displayReading = hun && eum ? `${hun} ${eum}` : eum || hun;

  return (
    <Paper
      onClick={onClick}
      style={{
        ...styles.card,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'border-color 0.15s ease',
      }}
      className="hanja-card"
    >
      <Text style={styles.primary}>
        {d.char}
      </Text>
      {styles.isFieldVisible('reading') && (
        <Text style={styles.secondary} mt={4} lineClamp={1}>
          {displayReading}
        </Text>
      )}
      <Group gap={4} mt={4} justify="center">
        {styles.isFieldVisible('stroke') && (
          <Text style={styles.tertiary}>{d.stroke_count}획</Text>
        )}
        {styles.isFieldVisible('radical') && d.radical_char && (
          <Text style={styles.tertiary}>{d.radical_char}부</Text>
        )}
        {styles.isFieldVisible('grade') && d.grade != null && (
          <Badge size="xs" variant="light" color="gray">
            {d.grade > 0 ? `${d.grade}급` : '특급'}
          </Badge>
        )}
      </Group>
    </Paper>
  );
}

// ============================================================
// 상세 패널
// ============================================================
function DetailPanel({ node, nodes, onClose, onSelect }: {
  node: any;
  nodes: any[];
  onClose: () => void;
  onSelect: (node: any) => void;
}) {
  const d = getNodeDomainData(node);

  // 관련 한자 찾기
  const sameRadical = useMemo(() =>
    nodes.filter(n => {
      const nd = getNodeDomainData(n);
      return nd.radical_char === d.radical_char && nd.char !== d.char;
    }).slice(0, 20),
    [nodes, d.radical_char, d.char],
  );

  const sameReading = useMemo(() => {
    const myReading = d.readings?.ko?.[0];
    if (!myReading) return [];
    return nodes.filter(n => {
      const nd = getNodeDomainData(n);
      return nd.readings?.ko?.includes(myReading) && nd.char !== d.char;
    }).slice(0, 20);
  }, [nodes, d.readings?.ko, d.char]);

  return (
    <Stack gap="lg" p="md">
      {/* 헤더 */}
      <Group justify="space-between">
        <ActionIcon variant="subtle" color="gray" onClick={onClose}>
          <ArrowLeft size={18} />
        </ActionIcon>
        {d.grade != null && (
          <Badge variant="light" color="gray">
            {d.grade > 0 ? `${d.grade}급` : '특급'}
          </Badge>
        )}
      </Group>

      <Stack gap={4} align="center">
        <Text fz={64} fw={700} lh={1}>{d.char}</Text>
        <Text fz="lg" fw={500}>
          {d.readings?.ko_hun?.[0] && `${d.readings.ko_hun[0]} `}
          {d.readings?.ko?.[0] || d.hangul_reading}
        </Text>
        <Text fz="xs" c="dimmed">
          부수: {d.radical_char} ({d.radical_name_ko}) | 총획: {d.stroke_count}
        </Text>
      </Stack>

      {/* 구성 원리 */}
      {d.composition && (
        <Paper p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
          <Text fz="xs" c="dimmed" mb={4}>구성 원리</Text>
          <Group gap="xs">
            <Badge variant="outline" color="gray" size="sm">{d.composition.type}</Badge>
            {d.composition.components?.length > 0 && (
              <Text fz="sm">{d.composition.components.join(' + ')}</Text>
            )}
          </Group>
          {d.composition.explanation && (
            <Text fz="sm" mt={4}>{d.composition.explanation}</Text>
          )}
          {d.composition.mnemonic && (
            <Text fz="xs" c="dimmed" mt={4} fs="italic">
              {d.composition.mnemonic}
            </Text>
          )}
        </Paper>
      )}

      {/* 읽기 정보 */}
      <Paper p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <Text fz="xs" c="dimmed" mb={4}>읽기</Text>
        <Stack gap={2}>
          {d.readings?.ko?.length > 0 && (
            <Group gap="xs">
              <Text fz="xs" c="dimmed" w={32}>한국</Text>
              <Text fz="sm">{d.readings.ko.join(', ')}</Text>
            </Group>
          )}
          {d.readings?.cn_pinyin && (
            <Group gap="xs">
              <Text fz="xs" c="dimmed" w={32}>중국</Text>
              <Text fz="sm">{d.readings.cn_pinyin}</Text>
            </Group>
          )}
          {(d.readings?.jp_on || d.readings?.jp_kun) && (
            <Group gap="xs">
              <Text fz="xs" c="dimmed" w={32}>일본</Text>
              <Text fz="sm">
                {d.readings.jp_on && `${d.readings.jp_on}`}
                {d.readings.jp_on && d.readings.jp_kun && ' / '}
                {d.readings.jp_kun && `${d.readings.jp_kun}`}
              </Text>
            </Group>
          )}
        </Stack>
      </Paper>

      {/* 영문 정의 */}
      {d.definition_en && (
        <Paper p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
          <Text fz="xs" c="dimmed" mb={4}>영문 정의</Text>
          <Text fz="sm">{d.definition_en}</Text>
        </Paper>
      )}

      {/* 관련 한자 — 같은 부수 */}
      {sameRadical.length > 0 && (
        <Box>
          <Text fz="xs" c="dimmed" mb={4}>
            같은 부수 ({d.radical_char})
          </Text>
          <Group gap={4}>
            {sameRadical.map(n => (
              <Paper
                key={n.id}
                p={4}
                onClick={() => onSelect(n)}
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text fz="sm">{getNodeDomainData(n).char}</Text>
              </Paper>
            ))}
          </Group>
        </Box>
      )}

      {/* 관련 한자 — 같은 음 */}
      {sameReading.length > 0 && (
        <Box>
          <Text fz="xs" c="dimmed" mb={4}>
            같은 음 ({d.readings?.ko?.[0]})
          </Text>
          <Group gap={4}>
            {sameReading.map(n => (
              <Paper
                key={n.id}
                p={4}
                onClick={() => onSelect(n)}
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text fz="sm">{getNodeDomainData(n).char}</Text>
              </Paper>
            ))}
          </Group>
        </Box>
      )}
    </Stack>
  );
}

// ============================================================
// 메인 DictionaryView
// ============================================================
const PAGE_SIZE = 100;

interface DictionaryViewProps extends ViewProps {
  onSearch?: (params: {
    query?: string;
    radical?: string;
    grade?: string;
    strokeMin?: string;
    strokeMax?: string;
    compType?: string;
    page?: number;
  }) => void;
  total?: number;
  loading?: boolean;
}

export function DictionaryView({ nodes, onSearch, total, loading, layoutConfig }: DictionaryViewProps) {
  const styles = useLayoutStyles(layoutConfig);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(searchQuery, 200);
  const [filters, setFilters] = useState<Filters>({});
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [page, setPage] = useState(1);

  // 서버사이드 검색 모드 여부
  const isServerMode = !!onSearch;

  // 한자 추출
  const hanjaChars = useMemo(
    () => extractHanjaChars(debouncedQuery),
    [debouncedQuery],
  );

  // 서버 검색 트리거 (debounced query 또는 필터 변경 시)
  useEffect(() => {
    if (!isServerMode) return;
    onSearch({
      query: debouncedQuery || undefined,
      radical: filters.radical,
      grade: filters.gradeMin?.toString(),
      page,
    });
  }, [debouncedQuery, filters, page, isServerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 클라이언트 필터링 (ViewRenderer 경유 시)
  const filteredNodes = useMemo(() => {
    if (isServerMode) return nodes; // 서버가 이미 필터링함

    let result = nodes.filter(n => {
      const d = getNodeDomainData(n);
      if (d.type !== 'hanja') return false;
      if (!matchesSearch(n, debouncedQuery, hanjaChars)) return false;
      if (!matchesFilters(n, filters)) return false;
      return true;
    });

    if (hanjaChars.length > 0) {
      const order = new Map(hanjaChars.map((c, i) => [c, i]));
      result.sort((a, b) => {
        const aIdx = order.get(getNodeDomainData(a).char) ?? 999;
        const bIdx = order.get(getNodeDomainData(b).char) ?? 999;
        return aIdx - bIdx;
      });
    }

    return result;
  }, [nodes, debouncedQuery, hanjaChars, filters, isServerMode]);

  // 사용 가능한 필터 (빈 필터 숨김)
  const availableFilters = useMemo(
    () => getAvailableFilters((nodes ?? []).filter(n => getNodeDomainData(n).type === 'hanja')),
    [nodes],
  );

  // 페이지네이션
  const totalCount = isServerMode ? (total ?? nodes.length) : filteredNodes.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pagedNodes = isServerMode ? filteredNodes : filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCardClick = useCallback((node: any) => {
    setSelectedNode(node);
    openDrawer();
  }, [openDrawer]);

  const handleFilterChange = useCallback((key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilter = useCallback((key: keyof Filters) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    setPage(1);
  }, []);

  return (
    <Stack gap="sm" p="md">
      {/* 검색바 */}
      <TextInput
        placeholder="한자, 음, 훈 검색 (문장 붙여넣기 가능)"
        leftSection={<MagnifyingGlass size={16} />}
        rightSection={searchQuery ? (
          <ActionIcon variant="subtle" size="sm" onClick={() => handleSearchChange('')}>
            <X size={14} />
          </ActionIcon>
        ) : null}
        value={searchQuery}
        onChange={e => handleSearchChange(e.currentTarget.value)}
        styles={{ input: { fontSize: 14 } }}
      />

      {/* 한자 추출 표시 */}
      {hanjaChars.length > 0 && (
        <Group gap={4}>
          <Text fz="xs" c="dimmed">추출된 한자:</Text>
          {hanjaChars.map((c, i) => (
            <Badge key={i} variant="light" color="gray" size="sm">{c}</Badge>
          ))}
        </Group>
      )}

      {/* 필터 */}
      <Group gap="xs">
        {/* 부수 필터 */}
        {availableFilters.radicals.length > 0 && (
          <Select
            placeholder="부수"
            size="xs"
            clearable
            searchable
            value={filters.radical || null}
            onChange={val => val ? handleFilterChange('radical', val) : clearFilter('radical')}
            data={availableFilters.radicals.slice(0, 50).map(([char, count]) => ({
              value: char,
              label: `${char} (${count})`,
            }))}
            styles={{ input: { width: 90 } }}
          />
        )}

        {/* 급수 필터 */}
        {availableFilters.grades.length > 0 && (
          <Select
            placeholder="급수"
            size="xs"
            clearable
            value={filters.gradeMin?.toString() || null}
            onChange={val => {
              if (val) {
                const g = parseInt(val);
                handleFilterChange('gradeMin', g);
                handleFilterChange('gradeMax', g);
              } else {
                clearFilter('gradeMin');
                clearFilter('gradeMax');
              }
            }}
            data={availableFilters.grades.map(([grade, count]) => ({
              value: grade.toString(),
              label: `${grade > 0 ? `${grade}급` : '특급'} (${count})`,
            }))}
            styles={{ input: { width: 90 } }}
          />
        )}

        {/* 구성원리 필터 */}
        {availableFilters.compositionTypes.length > 0 && (
          <Select
            placeholder="구성원리"
            size="xs"
            clearable
            value={filters.compositionType || null}
            onChange={val => val ? handleFilterChange('compositionType', val) : clearFilter('compositionType')}
            data={availableFilters.compositionTypes.map(([type, count]) => ({
              value: type,
              label: `${type} (${count})`,
            }))}
            styles={{ input: { width: 100 } }}
          />
        )}
      </Group>

      {/* 활성 필터 칩 */}
      {Object.keys(filters).length > 0 && (
        <Group gap={4}>
          {filters.radical && (
            <Chip checked={false} size="xs" onClick={() => clearFilter('radical')}>
              {filters.radical}부 ×
            </Chip>
          )}
          {filters.gradeMin != null && (
            <Chip checked={false} size="xs" onClick={() => { clearFilter('gradeMin'); clearFilter('gradeMax'); }}>
              {filters.gradeMin}급 ×
            </Chip>
          )}
          {filters.compositionType && (
            <Chip checked={false} size="xs" onClick={() => clearFilter('compositionType')}>
              {filters.compositionType} ×
            </Chip>
          )}
        </Group>
      )}

      {/* 결과 카운트 + 로딩 */}
      <Group gap="xs">
        {loading && <Loader size={12} />}
        <Text fz="xs" c="dimmed">
          {totalCount.toLocaleString()}자
        </Text>
      </Group>

      {/* 카드 그리드 */}
      <SimpleGrid
        cols={typeof styles.gridColumns === 'number'
          ? styles.gridColumns
          : styles.gridColumns as Record<string, number>}
        spacing={styles.gridGap}
      >
        {pagedNodes.map(node => (
          <HanjaCard
            key={node.id}
            node={node}
            onClick={() => handleCardClick(node)}
            styles={styles}
          />
        ))}
      </SimpleGrid>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Group justify="center" mt="sm">
          <Pagination
            total={totalPages}
            value={page}
            onChange={setPage}
            size="sm"
          />
        </Group>
      )}

      {/* 상세 Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        size="sm"
        withCloseButton={false}
        styles={{
          body: { padding: 0 },
        }}
      >
        {selectedNode && (
          <ScrollArea h="100vh">
            <DetailPanel
              node={selectedNode}
              nodes={filteredNodes}
              onClose={closeDrawer}
              onSelect={node => setSelectedNode(node)}
            />
          </ScrollArea>
        )}
      </Drawer>
    </Stack>
  );
}
