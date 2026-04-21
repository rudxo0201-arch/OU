'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/ds';
import { QSBar } from '@/components/home/QSBar';
import { OrbGrid } from '@/components/home/OrbGrid';
import { DockBar } from '@/components/home/DockBar';
import { ViewRenderer } from '@/components/views/ViewRenderer';

const WIDGETS = [
  { label: '오늘 일정', domain: 'schedule', viewType: 'schedule-today', orbSlug: 'calendar' },
  { label: '할 일',    domain: 'task',     viewType: 'task-today',     orbSlug: 'task'     },
  { label: '지출',     domain: 'finance',  viewType: 'finance-today',  orbSlug: 'finance'  },
  { label: '습관',     domain: 'habit',    viewType: 'habit-log',      orbSlug: 'habit'    },
];

export default function HomePage() {
  return (
    <PageLayout>
      <div style={{
        paddingTop: 56 + 24,
        paddingBottom: 64 + 24,
        paddingLeft: 24,
        paddingRight: 24,
        maxWidth: 1024,
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ou-space-8)',
      }}>

        {/* QS 입력바 */}
        <div style={{ display: 'flex', justifyContent: 'center', animation: 'ou-fade-in 200ms ease-out' }}>
          <QSBar />
        </div>

        {/* Orb 그리드 */}
        <section>
          <SectionLabel>내 Orb</SectionLabel>
          <OrbGrid />
        </section>

        {/* 위젯 그리드 */}
        <section>
          <SectionLabel>위젯</SectionLabel>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {WIDGETS.map((w) => (
              <HomeWidget key={w.domain} {...w} />
            ))}
          </div>
        </section>
      </div>

      <DockBar />
    </PageLayout>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 'var(--ou-text-sm)',
      color: 'var(--ou-text-muted)',
      fontWeight: 500,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      marginBottom: 16,
    }}>
      {children}
    </h2>
  );
}

function HomeWidget({ label, domain, viewType, orbSlug }: {
  label: string;
  domain: string;
  viewType: string;
  orbSlug: string;
}) {
  const router = useRouter();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/nodes?domain=${domain}&limit=10`)
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((json) => {
        const raw = json.data ?? json;
        setNodes(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [domain]);

  return (
    <div
      onClick={() => router.push(`/orb/${orbSlug}`)}
      style={{
        background: 'var(--ou-glass)',
        backdropFilter: 'var(--ou-blur-light)',
        WebkitBackdropFilter: 'var(--ou-blur-light)',
        border: '1px solid var(--ou-glass-border)',
        borderRadius: 'var(--ou-radius-card)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all var(--ou-transition-fast)',
        minHeight: 120,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--ou-glass-hover)';
        e.currentTarget.style.borderColor = 'var(--ou-glass-border-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--ou-glass)';
        e.currentTarget.style.borderColor = 'var(--ou-glass-border)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{
        fontSize: 'var(--ou-text-xs)',
        color: 'var(--ou-text-muted)',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        {label}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          <span className="ou-spinner" style={{ width: 16, height: 16 }} />
        </div>
      ) : nodes.length === 0 ? (
        <div style={{
          fontSize: 'var(--ou-text-xs)',
          color: 'var(--ou-text-disabled)',
          textAlign: 'center',
          padding: '12px 0',
        }}>
          데이터 없음
        </div>
      ) : (
        <ViewRenderer viewType={viewType} nodes={nodes} inline />
      )}
    </div>
  );
}
