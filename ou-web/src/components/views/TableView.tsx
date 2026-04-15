'use client';

import { useState, useMemo } from 'react';
import {
  Table, ScrollArea, TextInput, Group, Badge, Text, Box,
  ActionIcon, Tooltip, Select,
} from '@mantine/core';
import { MagnifyingGlass, CaretUp, CaretDown } from '@phosphor-icons/react';

interface TableViewProps {
  nodes: any[];
  filters?: Record<string, any>;
}

type SortDir = 'asc' | 'desc';

export function TableView({ nodes }: TableViewProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  // 존재하는 도메인 추출 (빈 필터 원칙)
  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    for (const n of nodes) {
      if (n.domain) domains.add(n.domain);
    }
    return Array.from(domains).map(d => ({ value: d, label: d }));
  }, [nodes]);

  // 필터 + 검색 + 정렬
  const displayNodes = useMemo(() => {
    let filtered = nodes;

    if (domainFilter) {
      filtered = filtered.filter(n => n.domain === domainFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n => {
        const rawMatch = n.raw?.toLowerCase().includes(q);
        const domainDataMatch = n.domain_data
          ? JSON.stringify(n.domain_data).toLowerCase().includes(q)
          : false;
        return rawMatch || domainDataMatch;
      });
    }

    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? a.domain_data?.[sortKey] ?? '';
      const bVal = b[sortKey] ?? b.domain_data?.[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [nodes, search, sortKey, sortDir, domainFilter]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />;
  };

  return (
    <Box p="md">
      <Group gap="sm" mb="md">
        <TextInput
          placeholder="검색..."
          leftSection={<MagnifyingGlass size={14} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="xs"
          style={{ flex: 1, maxWidth: 300 }}
          styles={{ input: { background: 'transparent', border: '0.5px solid var(--mantine-color-default-border)' } }}
        />
        {availableDomains.length > 1 && (
          <Select
            placeholder="전체 도메인"
            data={availableDomains}
            value={domainFilter}
            onChange={setDomainFilter}
            clearable
            size="xs"
            style={{ width: 140 }}
          />
        )}
        <Text fz="xs" c="dimmed">{displayNodes.length}개</Text>
      </Group>

      <ScrollArea>
        <Table highlightOnHover fz="xs" verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ cursor: 'pointer' }} onClick={() => handleSort('domain')}>
                <Group gap={4}>도메인 <SortIcon col="domain" /></Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer' }} onClick={() => handleSort('raw')}>
                <Group gap={4}>내용 <SortIcon col="raw" /></Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer' }} onClick={() => handleSort('confidence')}>
                <Group gap={4}>신뢰도 <SortIcon col="confidence" /></Group>
              </Table.Th>
              <Table.Th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>
                <Group gap={4}>생성일 <SortIcon col="created_at" /></Group>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {displayNodes.map(node => (
              <Table.Tr key={node.id}>
                <Table.Td>
                  <Badge variant="light" color="gray" size="xs">{node.domain ?? '-'}</Badge>
                </Table.Td>
                <Table.Td style={{ maxWidth: 400 }}>
                  <Text fz="xs" lineClamp={1}>{node.raw ?? JSON.stringify(node.domain_data ?? {}).slice(0, 80)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fz="xs" c="dimmed">{node.confidence ?? '-'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fz="xs" c="dimmed">
                    {node.created_at ? new Date(node.created_at).toLocaleDateString('ko-KR') : '-'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
            {displayNodes.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" fz="xs" c="dimmed" py="xl">데이터가 없습니다</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}
