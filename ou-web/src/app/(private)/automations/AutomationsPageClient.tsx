'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lightning, Plus } from '@phosphor-icons/react';
import { AutomationCard } from '@/components/automation/AutomationCard';
import { AutomationBuilder } from '@/components/automation/AutomationBuilder';

interface AutomationNode {
  id: string;
  title: string;
  domain_data: Record<string, unknown>;
}

interface Props {
  automations: AutomationNode[];
}

export function AutomationsPageClient({ automations: initial }: Props) {
  const router = useRouter();
  const [automations, setAutomations] = useState(initial);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleToggle = async (id: string, enabled: boolean) => {
    // Optimistic update
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, domain_data: { ...a.domain_data, enabled } }
          : a,
      ),
    );

    const res = await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });

    if (!res.ok) {
      // Revert
      setAutomations((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, domain_data: { ...a.domain_data, enabled: !enabled } }
            : a,
        ),
      );
    }
  };

  const handleDelete = async (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));

    const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    if (!res.ok) refresh();
  };

  const handleRun = async (id: string) => {
    setLoading(true);
    try {
      await fetch(`/api/automations/${id}/run`, { method: 'POST' });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowBuilder(true);
  };

  const handleSave = async (data: {
    name: string;
    trigger: { type: string; config: Record<string, unknown> };
    actions: { type: string; config: Record<string, unknown> }[];
    enabled: boolean;
  }) => {
    setLoading(true);
    try {
      if (editingId) {
        await fetch(`/api/automations/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      setShowBuilder(false);
      setEditingId(null);
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const editingAutomation = editingId
    ? automations.find((a) => a.id === editingId)
    : null;

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightning size={28} weight="bold" />
          <h2 style={{ margin: 0 }}>자동화</h2>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowBuilder(true);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontSize: 14,
          }}
        >
          <Plus size={16} /> 새 자동화 만들기
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>처리 중...</span>
        </div>
      )}

      {automations.length === 0 && !showBuilder && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0' }}>
          <Lightning size={48} weight="thin" color="var(--color-dimmed)" />
          <span style={{ color: 'var(--color-dimmed)', textAlign: 'center' }}>
            아직 자동화가 없습니다.
            <br />
            반복 작업을 자동으로 처리해보세요.
          </span>
          <button
            onClick={() => setShowBuilder(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              border: '1px solid #1a1a1a', borderRadius: 6, background: 'transparent',
              cursor: 'pointer', fontSize: 14,
            }}
          >
            <Plus size={16} /> 첫 자동화 만들기
          </button>
        </div>
      )}

      {automations.length > 0 && !showBuilder && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation as any}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRun={handleRun}
            />
          ))}
        </div>
      )}

      {showBuilder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editingId ? '자동화 수정' : '새 자동화 만들기'}</h3>
              <button onClick={() => { setShowBuilder(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <AutomationBuilder
              initialData={
                editingAutomation
                  ? {
                      name: editingAutomation.title,
                      trigger: editingAutomation.domain_data.trigger as any,
                      actions: editingAutomation.domain_data.actions as any[],
                      enabled: editingAutomation.domain_data.enabled as boolean,
                    }
                  : undefined
              }
              onSave={handleSave}
              onCancel={() => {
                setShowBuilder(false);
                setEditingId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
