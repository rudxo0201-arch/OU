'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Stack, Text, Group, TextInput, Button, SimpleGrid, Loader } from '@mantine/core';
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
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--mantine-color-dark-8)',
      }}
    >
      <Stack align="center" justify="center" style={{ flex: 1 }} p="xl" gap="lg">
        <Code size={48} color="var(--mantine-color-dark-3)" />
        <Text fz="lg" fw={600}>개발 환경</Text>
        <Text fz="sm" c="dimmed" ta="center">프로젝트를 선택하거나 새로 만드세요</Text>

        {/* 기존 프로젝트 목록 */}
        {projects.length > 0 && (
          <Stack gap="xs" w="100%" maw={500}>
            {projects.map(p => (
              <Group
                key={p.id}
                gap="sm"
                p="sm"
                wrap="nowrap"
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--mantine-color-dark-4)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => handleSelect(p)}
                className="hover-border"
              >
                <Folder size={20} color="var(--mantine-color-dark-2)" />
                <Box style={{ flex: 1 }}>
                  <Text fz="sm" fw={500}>{p.name}</Text>
                  {p.description && <Text fz={10} c="dimmed" lineClamp={1}>{p.description}</Text>}
                </Box>
                <ArrowRight size={14} color="var(--mantine-color-dark-3)" />
              </Group>
            ))}
          </Stack>
        )}

        {/* 새 프로젝트 */}
        {!showCreate ? (
          <Button
            variant="light"
            leftSection={<Plus size={14} />}
            onClick={() => setShowCreate(true)}
          >
            새 프로젝트
          </Button>
        ) : (
          <Stack gap="sm" w="100%" maw={500}>
            <TextInput
              value={newName}
              onChange={e => setNewName(e.currentTarget.value)}
              placeholder="프로젝트 이름"
              size="sm"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            />

            {/* 템플릿 선택 */}
            <SimpleGrid cols={2} spacing="xs">
              {TEMPLATES.map(t => (
                <Box
                  key={t.id}
                  p="xs"
                  style={{
                    borderRadius: 6,
                    border: selectedTemplate === t.id
                      ? '1px solid var(--mantine-color-blue-5)'
                      : '1px solid var(--mantine-color-dark-4)',
                    cursor: 'pointer',
                    background: selectedTemplate === t.id
                      ? 'var(--mantine-color-dark-6)'
                      : 'transparent',
                  }}
                  onClick={() => setSelectedTemplate(t.id)}
                >
                  <Text fz={12} fw={500}>{t.name}</Text>
                  <Text fz={10} c="dimmed">{t.description}</Text>
                </Box>
              ))}
            </SimpleGrid>

            <Group gap="xs" justify="flex-end">
              <Button variant="subtle" size="xs" onClick={() => setShowCreate(false)}>
                취소
              </Button>
              <Button
                size="xs"
                onClick={handleCreate}
                disabled={!newName.trim()}
                loading={creating}
              >
                만들기
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
