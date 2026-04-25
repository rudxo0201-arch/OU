'use client';

import { useState, useEffect, type ComponentType } from 'react';
import { DS_COMPONENTS, DS_GROUPS, DS_GROUP_LABELS, DS_COMPONENTS_MAP, type DsGroup, type DsComponentMeta } from '@/components/ds/registry';
import { DS_FOUNDATION, type DsFoundationGroup } from '@/components/ds/foundation';
import { OuTabs, OuSkeleton, OuSectionTitle, OuDivider, OuBadge } from '@/components/ds';

type PageTab = 'foundation' | 'components' | 'patterns';

export default function DsPage() {
  const [tab, setTab] = useState<PageTab>('components');
  const [activeId, setActiveId] = useState<string>('OuButton');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ou-bg)',
      color: 'var(--ou-text-body)',
      fontFamily: 'var(--ou-font-body)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 28px',
        borderBottom: '1px solid var(--ou-border-faint)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--ou-text-strong)',
          letterSpacing: '-0.01em',
          fontFamily: 'var(--ou-font-mono)',
        }}>
          OU DS
        </span>
        <OuTabs
          tabs={[
            { key: 'foundation',  label: 'Foundation' },
            { key: 'components',  label: 'Components' },
            { key: 'patterns',    label: 'Patterns' },
          ]}
          activeKey={tab}
          onChange={k => setTab(k as PageTab)}
        />
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 10,
          color: 'var(--ou-text-disabled)',
          fontFamily: 'var(--ou-font-mono)',
        }}>
          {DS_COMPONENTS.filter(c => c.status === 'stable').length} stable components
        </span>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — Components 탭만 표시 */}
        {tab === 'components' && (
          <Sidebar activeId={activeId} onSelect={setActiveId} />
        )}

        {/* Main */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          {tab === 'foundation'  && <FoundationTab />}
          {tab === 'components'  && <ComponentsTab activeId={activeId} />}
          {tab === 'patterns'    && <PatternsTab />}
        </main>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return (
    <aside style={{
      width: 200,
      borderRight: '1px solid var(--ou-border-faint)',
      padding: '16px 0',
      overflowY: 'auto',
      flexShrink: 0,
    }}>
      {DS_GROUPS.map(group => {
        const members = DS_COMPONENTS.filter(c => c.group === group);
        if (members.length === 0) return null;
        return (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{
              padding: '4px 16px 6px',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ou-text-disabled)',
            }}>
              {DS_GROUP_LABELS[group]}
            </div>
            {members.map(c => (
              <SidebarItem
                key={c.id}
                meta={c}
                isActive={activeId === c.id}
                onClick={() => onSelect(c.id)}
              />
            ))}
          </div>
        );
      })}
    </aside>
  );
}

function SidebarItem({ meta, isActive, onClick }: { meta: DsComponentMeta; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        textAlign: 'left',
        padding: '5px 16px',
        fontSize: 12,
        color: isActive ? 'var(--ou-text-strong)' : 'var(--ou-text-muted)',
        background: isActive ? 'var(--ou-surface-faint)' : 'none',
        borderLeft: `2px solid ${isActive ? 'var(--ou-text-strong)' : 'transparent'}`,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--ou-font-body)',
        transition: 'color var(--ou-transition-fast), background var(--ou-transition-fast)',
      }}
    >
      <span style={{ flex: 1 }}>{meta.name.split(' ')[0]}</span>
      {meta.status === 'experimental' && (
        <span style={{ fontSize: 8, color: 'var(--ou-warning)', fontFamily: 'var(--ou-font-mono)' }}>exp</span>
      )}
    </button>
  );
}

// ─── Foundation Tab ───────────────────────────────────────────────────────────

function FoundationTab() {
  return (
    <div style={{ maxWidth: 960 }}>
      {DS_FOUNDATION.map(section => (
        <div key={section.group} style={{ marginBottom: 48 }}>
          <OuSectionTitle style={{ marginBottom: 16 }}>{section.label}</OuSectionTitle>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 8,
          }}>
            {section.tokens.map(token => (
              <TokenCard key={token.name} token={token} group={section.group} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TokenCard({ token, group }: { token: { name: string; desc: string }; group: DsFoundationGroup }) {
  const isColor     = group === 'color';
  const isElevation = group === 'elevation';
  const isShape     = group === 'shape';

  return (
    <div style={{
      border: '1px solid var(--ou-border-faint)',
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      {/* Preview swatch */}
      {isColor && (
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: `var(${token.name})`,
          border: '1px solid var(--ou-border-faint)',
          flexShrink: 0,
          marginTop: 2,
        }} />
      )}
      {isElevation && (
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: 'var(--ou-bg-elevated)',
          boxShadow: `var(${token.name})`,
          flexShrink: 0,
          marginTop: 2,
        }} />
      )}
      {isShape && (
        <div style={{
          width: 24,
          height: 24,
          borderRadius: `var(${token.name})`,
          border: '1px solid var(--ou-border-subtle)',
          flexShrink: 0,
          marginTop: 2,
        }} />
      )}
      <div style={{ minWidth: 0 }}>
        <code style={{
          fontSize: 10,
          color: 'var(--ou-text-secondary)',
          fontFamily: 'var(--ou-font-mono)',
          display: 'block',
          marginBottom: 2,
          wordBreak: 'break-all',
        }}>
          {token.name}
        </code>
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{token.desc}</span>
      </div>
    </div>
  );
}

// ─── Components Tab ───────────────────────────────────────────────────────────

function ComponentsTab({ activeId }: { activeId: string }) {
  const meta = DS_COMPONENTS_MAP.get(activeId);
  if (!meta) return null;
  return <ComponentShowcase meta={meta} />;
}

function ComponentShowcase({ meta }: { meta: DsComponentMeta }) {
  type ExampleEntry = { label: string; Component: ComponentType };
  const [examples, setExamples] = useState<ExampleEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setExamples(null);
    setLoadError(false);
    import(`@/components/ds/_examples/${meta.id}.tsx`)
      .then(mod => {
        const key = Object.keys(mod).find(k => k.endsWith('Examples'));
        if (key && Array.isArray(mod[key])) {
          setExamples(mod[key] as ExampleEntry[]);
        } else {
          setExamples([]);
        }
      })
      .catch(() => setLoadError(true));
  }, [meta.id]);

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--ou-text-strong)',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--ou-font-body)',
          }}>
            {meta.name}
          </h1>
          <OuBadge>{meta.group}</OuBadge>
          {meta.status !== 'stable' && (
            <OuBadge accent>{meta.status}</OuBadge>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.6 }}>
          {meta.description}
        </p>
      </div>

      {/* Meta chips */}
      {(meta.variants || meta.sizes) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {meta.variants?.map(v => (
            <code key={v} style={{
              fontSize: 10, padding: '2px 8px',
              borderRadius: 'var(--ou-radius-sm)',
              background: 'var(--ou-surface-faint)',
              border: '1px solid var(--ou-border-faint)',
              color: 'var(--ou-text-muted)',
              fontFamily: 'var(--ou-font-mono)',
            }}>
              variant=&quot;{v}&quot;
            </code>
          ))}
          {meta.sizes?.map(s => (
            <code key={s} style={{
              fontSize: 10, padding: '2px 8px',
              borderRadius: 'var(--ou-radius-sm)',
              background: 'var(--ou-surface-faint)',
              border: '1px solid var(--ou-border-faint)',
              color: 'var(--ou-text-muted)',
              fontFamily: 'var(--ou-font-mono)',
            }}>
              {s}
            </code>
          ))}
        </div>
      )}

      {/* Import line */}
      <div style={{
        padding: '8px 14px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--ou-border-faint)',
        marginBottom: 28,
        fontFamily: 'var(--ou-font-mono)',
        fontSize: 11,
        color: 'var(--ou-text-muted)',
      }}>
        import {'{ '}{meta.id.split(' ')[0]}{' }'} from{' '}
        <span style={{ color: 'var(--ou-text-secondary)' }}>&apos;{meta.importPath}&apos;</span>
      </div>

      <OuDivider style={{ marginBottom: 24 }} />

      {/* Examples */}
      {loadError && (
        <div style={{ color: 'var(--ou-text-disabled)', fontSize: 12 }}>
          예시 파일 없음 — <code style={{ fontFamily: 'var(--ou-font-mono)' }}>_examples/{meta.id}.tsx</code> 추가 시 자동 표시.
        </div>
      )}
      {!loadError && examples === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <OuSkeleton width="100%" height={120} />
          <OuSkeleton width="100%" height={120} />
        </div>
      )}
      {examples && examples.length === 0 && !loadError && (
        <div style={{ color: 'var(--ou-text-disabled)', fontSize: 12 }}>
          예시 파일에 Examples 배열이 없습니다.
        </div>
      )}
      {examples && examples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {examples.map(ex => (
            <ExampleBlock key={ex.label} label={ex.label} Component={ex.Component} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExampleBlock({ label, Component }: { label: string; Component: ComponentType }) {
  return (
    <div style={{
      border: '1px solid var(--ou-border-faint)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '28px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 90,
        background: 'var(--ou-bg)',
      }}>
        <Component />
      </div>
      <div style={{
        padding: '6px 14px',
        borderTop: '1px solid var(--ou-border-faint)',
        background: 'rgba(255,255,255,0.015)',
        fontSize: 10,
        color: 'var(--ou-text-disabled)',
        fontFamily: 'var(--ou-font-mono)',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Patterns Tab ─────────────────────────────────────────────────────────────

function PatternsTab() {
  return (
    <div style={{ maxWidth: 560, textAlign: 'center', paddingTop: 80 }}>
      <OuSectionTitle style={{ justifyContent: 'center', marginBottom: 20 }}>
        Patterns
      </OuSectionTitle>
      <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.7, margin: 0 }}>
        KRDS Basic Patterns(form-field, confirmation-modal, empty-state, error-banner) 계층이 여기에 들어옵니다.
        <br /><br />
        Phase 2에서 <code style={{ fontFamily: 'var(--ou-font-mono)', fontSize: 11 }}>src/components/ds/patterns/</code> 아래 컴포넌트들이 등록되면 자동 표시됩니다.
      </p>
    </div>
  );
}
