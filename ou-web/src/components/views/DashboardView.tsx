'use client';

import { useMemo } from 'react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>Dashboard</span>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatCard icon={<Database size={16} />} label="Total Nodes" value={totalCount} />
        <StatCard icon={<ChartBar size={16} />} label="Domains" value={domainStats.length} />
        <StatCard icon={<Clock size={16} />} label="Recent (7d)" value={recentCount} />
      </div>

      {/* Bar chart */}
      {domainStats.length > 0 && (
        <div
          style={{
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', fontWeight: 500, display: 'block', marginBottom: 8 }}>
            Nodes by Domain
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {domainStats.slice(0, 8).map(d => (
              <div key={d.domain} style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, width: 80, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.domain}
                </span>
                <div style={{ flex: 1, height: 16, position: 'relative' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(d.count / maxDomainCount) * 100}%`,
                      backgroundColor: 'var(--ou-gray-4, #aaa)',
                      borderRadius: 3,
                      minWidth: 4,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent nodes */}
      {recentNodes.length > 0 && (
        <div
          style={{
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', fontWeight: 500, display: 'block', marginBottom: 8 }}>
            Recent Nodes
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentNodes.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', minHeight: 28, alignItems: 'center' }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--ou-gray-5, #888)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.domain_data?.title ?? ((n.raw ?? '').slice(0, 50) || 'Untitled')}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', flexShrink: 0 }}>
                  {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div
      style={{
        border: '0.5px solid var(--ou-border, #333)',
        borderRadius: 6,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
        <span style={{ color: 'var(--ou-text-dimmed, #888)' }}>{icon}</span>
        <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
