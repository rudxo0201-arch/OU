'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container, Title, Text, Stack, Group, Button,
  Modal, Loader, Center,
} from '@mantine/core';
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
    <Container size="md" py="xl">
      <Group justify="space-between" mb="xl">
        <Group gap="sm">
          <Lightning size={28} weight="bold" />
          <Title order={2}>자동화</Title>
        </Group>
        <Button
          color="dark"
          leftSection={<Plus size={16} />}
          onClick={() => {
            setEditingId(null);
            setShowBuilder(true);
          }}
        >
          새 자동화 만들기
        </Button>
      </Group>

      {loading && (
        <Center py="md">
          <Loader color="dark" size="sm" />
        </Center>
      )}

      {automations.length === 0 && !showBuilder && (
        <Stack align="center" gap="md" py={60}>
          <Lightning size={48} weight="thin" color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" ta="center">
            아직 자동화가 없습니다.
            <br />
            반복 작업을 자동으로 처리해보세요.
          </Text>
          <Button
            variant="outline"
            color="dark"
            leftSection={<Plus size={16} />}
            onClick={() => setShowBuilder(true)}
          >
            첫 자동화 만들기
          </Button>
        </Stack>
      )}

      {automations.length > 0 && !showBuilder && (
        <Stack gap="sm">
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
        </Stack>
      )}

      <Modal
        opened={showBuilder}
        onClose={() => {
          setShowBuilder(false);
          setEditingId(null);
        }}
        title={editingId ? '자동화 수정' : '새 자동화 만들기'}
        size="lg"
        centered
      >
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
      </Modal>
    </Container>
  );
}
