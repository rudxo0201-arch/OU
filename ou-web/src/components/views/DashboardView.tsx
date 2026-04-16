'use client';

import { useMemo } from 'react';
import { Stack, Text, Box, SimpleGrid, Group } from '@mantine/core';
import { ChartBar, Database, Clock } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

interface DomainStat {
  domain: string;
  count: number;
}

export function DashboardView({ nodes }: ViewProps) {
  const { domainStats, recentNodes, totalCount, recentCount } = useMemo(() => {
    const domainMap = new Map<string, number>();
    for (const n of nodes) {
      const d = n.domain ?? n.domain_data?.domain ?? 'default';
      domainMap.set(d, (domainMap.get(d) ?? 0) + 1);
    }

    const stats: DomainStat[] = Array.from(domainMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const recent = nodes
      .filter(n => {
        const t = n.created_at ? new Date(n.created_at).getTime() : 0;
        return t > weekAgo;
      })
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);

    return {
      domainStats: stats,
      recentNodes: recent,
      totalCount: nodes.length,
      recentCount: recent.length,
    };
  }, [nodes]);

  if (nodes.length === 0) return null;

  const maxDomainCount = Math.max(1, ...domainStats.map(d => d.count));

  return (
    <Stack gap="md" p="md">
      <Text fz="xs" c="dimmed">Dashboard</Text>

      {/* Stat cards */}
      <SimpleGrid cols={3} spacing="xs">
        <StatCard icon={<Database size={16} />} label="Total Nodes" value={totalCount} />
        <StatCard icon={<ChartBar size={16} />} label="Domains" value={domainStats.length} />
        <StatCard icon={<Clock size={16} />} label="Recent (7d)" value={recentCount} />
      </SimpleGrid>

      {/* Bar chart */}
      {domainStats.length > 0 && (
        <Box
          style={{
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <Text fz={11} c="dimmed" fw={500} mb={8}>
            Nodes by Domain
          </Text>
          <Stack gap={6}>
            {domainStats.slice(0, 8).map(d => (
              <Group key={d.domain} gap={8} wrap="nowrap">
                <Text fz={11} style={{ width: 80, flexShrink: 0 }} truncate>
                  {d.domain}
                </Text>
                <Box style={{ flex: 1, height: 16, position: 'relative' }}>
                  <Box
                    style={{
                      height: '100%',
                      width: `${(d.count / maxDomainCount) * 100}%`,
                      backgroundColor: 'var(--mantine-color-gray-4)',
                      borderRadius: 3,
                      minWidth: 4,
                    }}
                  />
                </Box>
                <Text fz={11} c="dimmed" style={{ width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {d.count}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      )}

      {/* Recent nodes */}
      {recentNodes.length > 0 && (
        <Box
          style={{
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <Text fz={11} c="dimmed" fw={500} mb={8}>
            Recent Nodes
          </Text>
          <Stack gap={4}>
            {recentNodes.map(n => (
              <Group key={n.id} gap={8} wrap="nowrap" style={{ minHeight: 28 }} align="center">
                <Box
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--mantine-color-gray-5)',
                    flexShrink: 0,
                  }}
                />
                <Text fz={12} truncate style={{ flex: 1 }}>
                  {n.domain_data?.title ?? ((n.raw ?? '').slice(0, 50) || 'Untitled')}
                </Text>
                <Text fz={10} c="dimmed" style={{ flexShrink: 0 }}>
                  {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Box
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 6,
        padding: 12,
      }}
    >
      <Group gap={6} mb={4}>
        <Box style={{ color: 'var(--mantine-color-dimmed)' }}>{icon}</Box>
        <Text fz={10} c="dimmed">{label}</Text>
      </Group>
      <Text fz={20} fw={600}>{value}</Text>
    </Box>
  );
}
