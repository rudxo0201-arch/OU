'use client';

import { useState, useEffect, useCallback } from 'react';
import { Stack, Table, Text, Group, Select, Pagination, Badge, Paper } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profiles?: {
    email: string | null;
    display_name: string | null;
  } | null;
}

export function AuditLog() {
  const supabase = createClient();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const PAGE_SIZE = 20;

  // Fetch unique action types
  useEffect(() => {
    supabase
      .from('api_audit_log')
      .select('action')
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map(d => d.action).filter(Boolean)));
          setActions(unique);
        }
      });
  }, []);

  const fetchEntries = useCallback(async () => {
    let query = supabase
      .from('api_audit_log')
      .select('id, admin_id, action, target_type, target_id, metadata, ip_address, created_at, profiles(email, display_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (actionFilter) query = query.eq('action', actionFilter);

    const { data, count } = await query;
    setEntries((data as AuditEntry[] | null) ?? []);
    setTotal(count ?? 0);
  }, [page, actionFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => { setPage(1); }, [actionFilter]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Text fz="xs" c="dimmed">총 {total.toLocaleString()}건</Text>
        <Select
          placeholder="작업 유형 필터"
          data={actions ?? []}
          value={actionFilter}
          onChange={setActionFilter}
          clearable
          size="xs"
          w={200}
        />
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>시각</Table.Th>
            <Table.Th>관리자</Table.Th>
            <Table.Th>작업</Table.Th>
            <Table.Th>대상</Table.Th>
            <Table.Th>IP</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map(entry => (
            <Table.Tr key={entry.id}>
              <Table.Td>
                <Text fz="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(entry.created_at).toLocaleString('ko-KR')}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" lineClamp={1}>
                  {entry.profiles?.display_name ?? entry.profiles?.email ?? entry.admin_id?.slice(0, 8)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color="gray" size="sm">{entry.action}</Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="nowrap">
                  {entry.target_type && (
                    <Badge variant="outline" color="gray" size="xs">{entry.target_type}</Badge>
                  )}
                  {entry.target_id && (
                    <Text fz="xs" c="dimmed" ff="monospace" lineClamp={1}>
                      {entry.target_id.slice(0, 12)}...
                    </Text>
                  )}
                  {!entry.target_type && !entry.target_id && (
                    <Text fz="xs" c="dimmed">-</Text>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" c="dimmed" ff="monospace">{entry.ip_address ?? '-'}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {entries.length === 0 && (
        <Text c="dimmed" ta="center" py="xl" fz="sm">감사 로그가 없어요.</Text>
      )}

      <Group justify="center">
        <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} size="sm" />
      </Group>
    </Stack>
  );
}
