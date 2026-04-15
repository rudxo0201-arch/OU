'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Stack, Paper, Group, Text, Button, Badge, Checkbox, Pagination } from '@mantine/core';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { useSelection } from '@/hooks/useSelection';

interface VerifyRequest {
  id: string;
  reason: string;
  suggested_correction: string | null;
  vote_approve: number;
  vote_reject: number;
  created_at: string;
  data_nodes: {
    raw: string | null;
    domain: string;
  } | null;
}

export function VerifyQueue() {
  const supabase = createClient();
  const [requests, setRequests] = useState<VerifyRequest[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;

  const pageIds = useMemo(() => requests.map(r => r.id), [requests]);
  const selection = useSelection<string>(pageIds);

  const fetchRequests = useCallback(async () => {
    const { data, count } = await supabase
      .from('verification_requests')
      .select('id, reason, suggested_correction, vote_approve, vote_reject, created_at, data_nodes(raw, domain)', { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    setRequests((data as VerifyRequest[] | null) ?? []);
    setTotal(count ?? 0);
    selection.clearAll();
  }, [page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    await supabase
      .from('verification_requests')
      .update({
        status: action === 'approve' ? 'resolved' : 'escalated',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    fetchRequests();
  };

  const handleBatch = async (action: 'approve' | 'reject') => {
    if (selection.count === 0) return;
    setLoading(true);
    const ids = Array.from(selection.selected);
    await supabase
      .from('verification_requests')
      .update({
        status: action === 'approve' ? 'resolved' : 'escalated',
        resolved_at: new Date().toISOString(),
      })
      .in('id', ids);
    setLoading(false);
    fetchRequests();
  };

  const handleHeaderCheckbox = () => {
    if (selection.headerCheckbox.checked) {
      selection.deselectPage(pageIds);
    } else {
      selection.selectPage(pageIds);
    }
  };

  if (total === 0 && requests.length === 0) {
    return <Text c="dimmed" ta="center" py="xl">검토 대기 항목이 없어요.</Text>;
  }

  return (
    <Stack gap="md">
      {/* Batch actions */}
      <Paper p="sm">
        <Group justify="space-between">
          <Group gap="sm">
            <Checkbox
              size="xs"
              checked={selection.headerCheckbox.checked}
              indeterminate={selection.headerCheckbox.indeterminate}
              onChange={handleHeaderCheckbox}
              label={<Text fz="xs" c="dimmed">전체 선택 ({selection.selected.size}/{requests.length})</Text>}
            />
          </Group>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              color="gray"
              disabled={selection.count === 0}
              loading={loading}
              leftSection={<CheckCircle size={14} />}
              onClick={() => handleBatch('approve')}
            >
              일괄 승인
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              disabled={selection.count === 0}
              loading={loading}
              leftSection={<XCircle size={14} />}
              onClick={() => handleBatch('reject')}
            >
              일괄 거부
            </Button>
          </Group>
        </Group>
      </Paper>

      <Text fz="xs" c="dimmed">총 {total}건 대기 중</Text>

      {requests.map(req => (
        <Paper key={req.id} p="md" withBorder>
          <Group justify="space-between" mb="sm" align="flex-start">
            <Group gap="sm" align="flex-start">
              <Checkbox
                size="xs"
                mt={4}
                checked={selection.isSelected(req.id)}
                onChange={() => selection.toggle(req.id)}
              />
              <Stack gap={4}>
                <Group gap="xs">
                  <Badge variant="light" color="gray">{req.data_nodes?.domain ?? '-'}</Badge>
                  <Badge variant="outline" color="gray" size="xs">{req.reason}</Badge>
                </Group>
                <Text fz="xs" c="dimmed">
                  {new Date(req.created_at).toLocaleString('ko-KR')}
                </Text>
              </Stack>
            </Group>
            <Text fz="xs" c="dimmed">
              승인 {req.vote_approve} / 거부 {req.vote_reject}
            </Text>
          </Group>

          <Text fz="sm" mb="xs" style={{ whiteSpace: 'pre-wrap' }}>
            {req.data_nodes?.raw ?? '-'}
          </Text>

          {req.suggested_correction && (
            <Paper p="xs" bg="var(--mantine-color-gray-0)" mb="sm">
              <Text fz="xs" c="dimmed" fw={600} mb={2}>수정 제안:</Text>
              <Text fz="sm">{req.suggested_correction}</Text>
            </Paper>
          )}

          <Group gap="xs">
            <Button size="xs" variant="light" color="dark" onClick={() => handleResolve(req.id, 'approve')}>
              승인
            </Button>
            <Button size="xs" variant="light" color="gray" onClick={() => handleResolve(req.id, 'reject')}>
              거부
            </Button>
          </Group>
        </Paper>
      ))}

      <Group justify="center">
        <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} size="sm" />
      </Group>
    </Stack>
  );
}
