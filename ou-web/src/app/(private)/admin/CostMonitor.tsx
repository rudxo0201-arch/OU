'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Stack, Table, Text, Group, Badge, Paper, SimpleGrid,
  Pagination, NumberInput, Button, Select,
} from '@mantine/core';
import { CurrencyDollar, Warning } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface CostLog {
  id: string;
  operation: string;
  model: string;
  tokens: number;
  cost_usd: number;
  created_at: string;
}

type Period = 'today' | 'week' | 'month';

function getStartDate(period: Period): string {
  const d = new Date();
  if (period === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export function CostMonitor() {
  const supabase = createClient();
  const [logs, setLogs] = useState<CostLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [periodCosts, setPeriodCosts] = useState<Record<Period, number>>({ today: 0, week: 0, month: 0 });
  const [operationBreakdown, setOperationBreakdown] = useState<Record<string, number>>({});
  const [modelBreakdown, setModelBreakdown] = useState<Record<string, { cost: number; count: number }>>({});
  const [alertThreshold, setAlertThreshold] = useState<number>(10);
  const [savedThreshold, setSavedThreshold] = useState<number>(10);
  const [filterOp, setFilterOp] = useState<string | null>(null);
  const [operations, setOperations] = useState<string[]>([]);
  const PAGE_SIZE = 20;

  // Fetch period summaries
  const fetchSummary = useCallback(async () => {
    const periods: Period[] = ['today', 'week', 'month'];
    const results: Record<Period, number> = { today: 0, week: 0, month: 0 };

    await Promise.all(
      periods.map(async (p) => {
        const { data } = await supabase
          .from('api_cost_log')
          .select('cost_usd')
          .gte('created_at', getStartDate(p));
        results[p] = data?.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0) ?? 0;
      })
    );

    setPeriodCosts(results);
  }, []);

  // Fetch operation + model breakdown for this month
  const fetchBreakdown = useCallback(async () => {
    const { data } = await supabase
      .from('api_cost_log')
      .select('operation, model, cost_usd')
      .gte('created_at', getStartDate('month'));

    const opSums: Record<string, number> = {};
    const mdlSums: Record<string, { cost: number; count: number }> = {};
    const ops = new Set<string>();

    data?.forEach(log => {
      // Operation breakdown
      opSums[log.operation] = (opSums[log.operation] ?? 0) + (log.cost_usd ?? 0);
      ops.add(log.operation);

      // Model breakdown
      const model = log.model ?? 'unknown';
      if (!mdlSums[model]) mdlSums[model] = { cost: 0, count: 0 };
      mdlSums[model].cost += log.cost_usd ?? 0;
      mdlSums[model].count += 1;
    });

    setOperationBreakdown(opSums);
    setModelBreakdown(mdlSums);
    setOperations(Array.from(ops));
  }, []);

  // Fetch recent logs (paginated)
  const fetchLogs = useCallback(async () => {
    let query = supabase
      .from('api_cost_log')
      .select('id, operation, model, tokens, cost_usd, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (filterOp) query = query.eq('operation', filterOp);

    const { data, count } = await query;
    setLogs((data as CostLog[] | null) ?? []);
    setTotal(count ?? 0);
  }, [page, filterOp]);

  useEffect(() => { fetchSummary(); fetchBreakdown(); }, [fetchSummary, fetchBreakdown]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Load threshold from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ou_cost_alert_threshold');
    if (stored) {
      const v = parseFloat(stored);
      setAlertThreshold(v);
      setSavedThreshold(v);
    }
  }, []);

  const saveThreshold = () => {
    localStorage.setItem('ou_cost_alert_threshold', String(alertThreshold));
    setSavedThreshold(alertThreshold);
  };

  const isOverBudget = periodCosts.today > savedThreshold;

  return (
    <Stack gap="md">
      {/* Period summaries */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper p="md">
          <Group justify="space-between" mb="xs">
            <Text fz="xs" c="dimmed">오늘</Text>
            {isOverBudget && <Warning size={16} color="var(--mantine-color-red-6)" />}
          </Group>
          <Text fz="xl" fw={700} c={isOverBudget ? 'red' : undefined}>
            ${periodCosts.today.toFixed(4)}
          </Text>
        </Paper>
        <Paper p="md">
          <Text fz="xs" c="dimmed" mb="xs">이번 주</Text>
          <Text fz="xl" fw={700}>${periodCosts.week.toFixed(4)}</Text>
        </Paper>
        <Paper p="md">
          <Text fz="xs" c="dimmed" mb="xs">이번 달</Text>
          <Text fz="xl" fw={700}>${periodCosts.month.toFixed(4)}</Text>
        </Paper>
      </SimpleGrid>

      {/* Operation breakdown */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="sm">작업별 비용 (이번 달)</Text>
        <Group gap="xs" wrap="wrap">
          {Object.entries(operationBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([op, cost]) => (
              <Badge key={op} variant="light" color="gray" size="lg">
                {op}: ${cost.toFixed(4)}
              </Badge>
            ))}
          {Object.keys(operationBreakdown).length === 0 && (
            <Text fz="sm" c="dimmed">데이터 없음</Text>
          )}
        </Group>
      </Paper>

      {/* Model breakdown */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="sm">모델별 비용 (이번 달)</Text>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>모델</Table.Th>
              <Table.Th>호출 수</Table.Th>
              <Table.Th>비용(USD)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Object.entries(modelBreakdown)
              .sort(([, a], [, b]) => b.cost - a.cost)
              .map(([model, { cost, count }]) => (
                <Table.Tr key={model}>
                  <Table.Td><Text fz="xs">{model}</Text></Table.Td>
                  <Table.Td><Text fz="xs">{count.toLocaleString()}</Text></Table.Td>
                  <Table.Td>
                    <Text fz="xs" fw={600}>${cost.toFixed(4)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            {Object.keys(modelBreakdown).length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text fz="sm" c="dimmed" ta="center">데이터 없음</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Alert threshold */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="sm">일일 비용 알림 기준</Text>
        <Group gap="sm">
          <NumberInput
            value={alertThreshold}
            onChange={v => setAlertThreshold(typeof v === 'number' ? v : 10)}
            prefix="$"
            min={0}
            step={1}
            decimalScale={2}
            w={120}
            size="xs"
          />
          <Button
            size="xs"
            variant="light"
            color="dark"
            onClick={saveThreshold}
            disabled={alertThreshold === savedThreshold}
          >
            저장
          </Button>
          <Text fz="xs" c="dimmed">현재 기준: ${savedThreshold}</Text>
        </Group>
      </Paper>

      {/* Recent calls table */}
      <Group justify="space-between" align="flex-end">
        <Text fw={600} fz="sm">최근 API 호출</Text>
        <Select
          placeholder="작업 필터"
          data={operations}
          value={filterOp}
          onChange={setFilterOp}
          clearable
          size="xs"
          w={160}
        />
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>작업</Table.Th>
            <Table.Th>모델</Table.Th>
            <Table.Th>토큰</Table.Th>
            <Table.Th>비용(USD)</Table.Th>
            <Table.Th>시각</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {logs.map(log => (
            <Table.Tr key={log.id}>
              <Table.Td><Badge variant="light" color="gray" size="xs">{log.operation}</Badge></Table.Td>
              <Table.Td><Text fz="xs">{log.model}</Text></Table.Td>
              <Table.Td><Text fz="xs">{log.tokens?.toLocaleString()}</Text></Table.Td>
              <Table.Td>
                <Text fz="xs" c={log.cost_usd > 0.01 ? 'red' : undefined}>
                  ${log.cost_usd?.toFixed(6)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" c="dimmed">{new Date(log.created_at).toLocaleString('ko-KR')}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {logs.length === 0 && (
        <Text c="dimmed" ta="center" py="xl" fz="sm">기록이 없어요.</Text>
      )}

      <Group justify="center">
        <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} size="sm" />
      </Group>
    </Stack>
  );
}
