'use client';

import { useState, useEffect, useCallback } from 'react';
import { Stack, Paper, Text, Group, Button, Badge, SimpleGrid, Box, Progress, Table, TextInput, Select } from '@mantine/core';
import { Leaf, MagnifyingGlass, ArrowClockwise } from '@phosphor-icons/react';

interface BonchoStats {
  total: number;
  starred: number;
  enriched: number;
  pending: number;
  partial: number;
}

interface BonchoNode {
  id: string;
  title: string;
  domain_data: {
    herb_id: string;
    name_korean: string;
    name_hanja: string | null;
    category_minor: string | null;
    starred: boolean;
    enrichment_status: string;
    nature?: string[] | null;
    flavor?: string[] | null;
    channel_tropism?: string[] | null;
    efficacy?: string[] | null;
    indications?: string[] | null;
  };
}

export function BonchoManager() {
  const [stats, setStats] = useState<BonchoStats | null>(null);
  const [herbs, setHerbs] = useState<BonchoNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/boncho/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setHerbs(data.herbs ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch boncho data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action: string, params?: Record<string, string>) => {
    setActionLoading(action);
    setMessage(null);
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      const url = action === 'seed' || action === 'seed-all'
        ? `/api/admin/seed?type=${action === 'seed-all' ? 'boncho-all' : 'boncho'}`
        : `/api/admin/boncho/enrich${query}`;

      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      setMessage(data.message ?? (data.error ? `오류: ${data.error}` : '완료'));
      fetchData();
    } catch (e: any) {
      setMessage(`오류: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredHerbs = herbs.filter(h => {
    const matchSearch = !search ||
      h.domain_data.name_korean?.includes(search) ||
      h.domain_data.name_hanja?.includes(search) ||
      h.domain_data.herb_id?.includes(search);
    const matchStatus = !statusFilter || h.domain_data.enrichment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const enrichedPercent = stats ? Math.round((stats.enriched / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <Stack gap="md">
      {/* Stats */}
      {stats && (
        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
          <Paper p="sm">
            <Text fz="xs" c="dimmed">전체</Text>
            <Text fz="lg" fw={700}>{stats.total}</Text>
          </Paper>
          <Paper p="sm">
            <Text fz="xs" c="dimmed">주요(★)</Text>
            <Text fz="lg" fw={700}>{stats.starred}</Text>
          </Paper>
          <Paper p="sm">
            <Text fz="xs" c="dimmed">보강 완료</Text>
            <Text fz="lg" fw={700} c="green">{stats.enriched}</Text>
          </Paper>
          <Paper p="sm">
            <Text fz="xs" c="dimmed">대기</Text>
            <Text fz="lg" fw={700} c="yellow">{stats.pending}</Text>
          </Paper>
          <Paper p="sm">
            <Text fz="xs" c="dimmed">부분</Text>
            <Text fz="lg" fw={700} c="gray">{stats.partial}</Text>
          </Paper>
        </SimpleGrid>
      )}

      {/* Progress */}
      {stats && stats.total > 0 && (
        <Paper p="sm">
          <Group justify="space-between" mb="xs">
            <Text fz="sm" fw={500}>보강 진행률</Text>
            <Text fz="sm" c="dimmed">{enrichedPercent}%</Text>
          </Group>
          <Progress value={enrichedPercent} size="lg" />
        </Paper>
      )}

      {/* Actions */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="md">작업</Text>
        <Group gap="sm" wrap="wrap">
          <Button
            variant="light"
            color="gray"
            leftSection={<Leaf size={14} />}
            loading={actionLoading === 'seed'}
            onClick={() => handleAction('seed')}
          >
            ★ Seed (91개)
          </Button>
          <Button
            variant="light"
            color="gray"
            leftSection={<Leaf size={14} />}
            loading={actionLoading === 'seed-all'}
            onClick={() => handleAction('seed-all')}
          >
            전체 Seed (504개)
          </Button>
          <Button
            variant="light"
            color="gray"
            leftSection={<ArrowClockwise size={14} />}
            loading={actionLoading === 'enrich-starred'}
            onClick={() => handleAction('enrich-starred', { scope: 'starred' })}
          >
            ★ 보강
          </Button>
          <Button
            variant="light"
            color="gray"
            leftSection={<ArrowClockwise size={14} />}
            loading={actionLoading === 'enrich-all'}
            onClick={() => handleAction('enrich-all', { scope: 'all' })}
          >
            전체 보강
          </Button>
        </Group>
        {message && (
          <Text fz="sm" mt="sm" c={message.startsWith('오류') ? 'red' : 'green'}>
            {message}
          </Text>
        )}
      </Paper>

      {/* Herb List */}
      <Paper p="md">
        <Group justify="space-between" mb="md">
          <Text fw={600} fz="sm">본초 목록 ({filteredHerbs.length})</Text>
          <Group gap="sm">
            <TextInput
              size="xs"
              placeholder="검색..."
              leftSection={<MagnifyingGlass size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 160 }}
            />
            <Select
              size="xs"
              placeholder="상태"
              clearable
              data={[
                { value: 'pending', label: '대기' },
                { value: 'partial', label: '부분' },
                { value: 'enriched', label: '완료' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 100 }}
            />
          </Group>
        </Group>

        {herbs.length === 0 ? (
          <Text fz="sm" c="dimmed" ta="center" py="xl">
            {loading ? '불러오는 중...' : '아직 본초 데이터가 없습니다. Seed를 먼저 실행하세요.'}
          </Text>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>번호</Table.Th>
                  <Table.Th>본초명</Table.Th>
                  <Table.Th>한자</Table.Th>
                  <Table.Th>분류</Table.Th>
                  <Table.Th>성</Table.Th>
                  <Table.Th>미</Table.Th>
                  <Table.Th>귀경</Table.Th>
                  <Table.Th>상태</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredHerbs.slice(0, 100).map((h) => (
                  <Table.Tr key={h.id}>
                    <Table.Td>{h.domain_data.herb_id}</Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        {h.domain_data.starred && <Text c="yellow">★</Text>}
                        <Text fw={500}>{h.domain_data.name_korean}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td c="dimmed">{h.domain_data.name_hanja ?? '-'}</Table.Td>
                    <Table.Td c="dimmed">{h.domain_data.category_minor ?? '-'}</Table.Td>
                    <Table.Td>{h.domain_data.nature?.join(', ') ?? '-'}</Table.Td>
                    <Table.Td>{h.domain_data.flavor?.join(', ') ?? '-'}</Table.Td>
                    <Table.Td>{h.domain_data.channel_tropism?.join(', ') ?? '-'}</Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          h.domain_data.enrichment_status === 'enriched' ? 'green' :
                          h.domain_data.enrichment_status === 'partial' ? 'yellow' : 'gray'
                        }
                      >
                        {h.domain_data.enrichment_status === 'enriched' ? '완료' :
                         h.domain_data.enrichment_status === 'partial' ? '부분' : '대기'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {filteredHerbs.length > 100 && (
              <Text fz="xs" c="dimmed" ta="center" mt="sm">
                {filteredHerbs.length - 100}개 더 있음
              </Text>
            )}
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
