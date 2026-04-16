'use client';

import { useCallback, useEffect, useState } from 'react';
import { Code, Plus, Folder, ArrowRight } from '@phosphor-icons/react';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';
import { TEMPLATES } from '@/lib/dev/templates';

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  template: string;
  updatedAt: string;
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const store = useDevWorkspaceStore();

  // 프로젝트 목록 로드
  useEffect(() => {
    fetch('/api/dev/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/dev/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, template: selectedTemplate }),
      });
      const data = await res.json();
      if (data.projectId) {
        store.setProject(data.projectId, name);
      }
    } finally {
      setCreating(false);
    }
  }, [newName, selectedTemplate, creating, store]);

  const handleSelect = useCallback((project: ProjectItem) => {
    store.setProject(project.id, project.name);
  }, [store]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--mantine-color-dark-8)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24, gap: 20 }}>
        <Code size={48} color="var(--mantine-color-dark-3)" />
        <span style={{ fontSize: 'var(--mantine-font-size-lg)', fontWeight: 600 }}>개발 환경</span>
        <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)', textAlign: 'center' }}>프로젝트를 선택하거나 새로 만드세요</span>

        {/* 기존 프로젝트 목록 */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: 500 }}>
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--mantine-color-dark-4)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                className="hover-border"
              >
                <Folder size={20} color="var(--mantine-color-dark-2)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, display: 'block' }}>{p.name}</span>
                  {p.description && <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</span>}
                </div>
                <ArrowRight size={14} color="var(--mantine-color-dark-3)" />
              </div>
            ))}
          </div>
        )}

        {/* 새 프로젝트 */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '8px 16px',
              border: '0.5px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-md)',
              background: 'rgba(255,255,255,0.06)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'inherit',
            }}
          >
            <Plus size={14} />
            새 프로젝트
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 500 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="프로젝트 이름"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              style={{ padding: '8px 12px', fontSize: 'var(--mantine-font-size-sm)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'transparent', color: 'inherit' }}
            />

            {/* 템플릿 선택 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    border: selectedTemplate === t.id
                      ? '1px solid var(--mantine-color-blue-5)'
                      : '1px solid var(--mantine-color-dark-4)',
                    cursor: 'pointer',
                    background: selectedTemplate === t.id
                      ? 'var(--mantine-color-dark-6)'
                      : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, display: 'block' }}>{t.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)' }}>{t.description}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: 4, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '4px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-xs)' }}>
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                style={{ padding: '4px 12px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: !newName.trim() || creating ? 'not-allowed' : 'pointer', opacity: !newName.trim() || creating ? 0.5 : 1, color: 'inherit', fontSize: 'var(--mantine-font-size-xs)' }}
              >
                {creating ? '만드는 중...' : '만들기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
