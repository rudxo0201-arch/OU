'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cleanDisplayText } from '@/lib/utils/cleanDisplayText';
import { useWidgetSize } from './useWidgetSize';

interface TaskNode {
  id: string;
  domain_data: {
    title?: string;
    deadline?: string;
    status?: string;
    priority?: string;
  };
  raw?: string;
  created_at: string;
}

export function TaskWidget() {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(rootRef);
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchTasks = useCallback(() => {
    fetch('/api/nodes?domain=task&limit=20')
      .then(r => r.json())
      .then(d => {
        const nodes: TaskNode[] = d.nodes || [];
        const pending = nodes.filter(n =>
          n.domain_data?.title &&
          (!n.domain_data?.status || n.domain_data.status === 'pending' || n.domain_data.status === 'in_progress')
        );
        setTasks(pending.slice(0, 8));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { router.prefetch('/orb/task'); }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('widget-task')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_nodes', filter: 'domain=eq.task' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTasks]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.domain === 'task') fetchTasks();
    };
    window.addEventListener('ou-node-created', handler);
    return () => window.removeEventListener('ou-node-created', handler);
  }, [fetchTasks]);

  return (
    <div ref={rootRef} style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '14px 16px',
    }}>
      {size !== 'sm' && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--ou-text-dimmed)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)',
          marginBottom: 12, flexShrink: 0,
        }}>
          할 일
        </span>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>불러오는 중...</div>
        ) : tasks.length === 0 ? (
          <button
            onClick={() => router.push('/orb/task')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', padding: 0,
              fontSize: 11, color: 'var(--ou-text-muted)',
              lineHeight: 1.6,
            }}
          >
            Orb에서 할 일을 말해보세요 →
          </button>
        ) : tasks.map(t => (
          <TaskRow key={t.id} task={t} size={size} onDone={fetchTasks} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task, size, onDone }: { task: TaskNode; size: string; onDone: () => void }) {
  const [done, setDone] = useState(task.domain_data.status === 'done');
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    const next = !done;
    setDone(next);
    setBusy(true);
    try {
      await fetch('/api/nodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: task.id,
          domain_data: { ...task.domain_data, status: next ? 'done' : 'pending' },
        }),
      });
      if (next) setTimeout(onDone, 600);
    } catch {
      setDone(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: done ? 0.4 : 1, transition: 'opacity 300ms' }}>
      <button
        onClick={toggle}
        style={{
          width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
          border: done ? 'none' : '1.5px solid var(--ou-border)',
          background: done ? 'rgba(255,255,255,0.7)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 160ms ease',
        }}
      >
        {done && <span style={{ fontSize: 10, color: '#0a0a0f', fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </button>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontSize: 12, fontWeight: 500,
          color: 'var(--ou-text-strong)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {task.domain_data.title
            ? cleanDisplayText(task.domain_data.title)
            : cleanDisplayText(task.raw?.slice(0, 50) ?? '') || '할 일'}
        </div>
        {size !== 'sm' && task.domain_data.deadline && (
          <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 1 }}>
            {task.domain_data.deadline}
          </div>
        )}
      </div>
    </div>
  );
}
