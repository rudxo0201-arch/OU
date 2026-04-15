'use client';

import { useState } from 'react';
import {
  Modal, Stack, TextInput, Select, Button, Text, Group,
} from '@mantine/core';
import {
  CalendarBlank, Kanban, ChartLine, Graph, Table, ListBullets,
} from '@phosphor-icons/react';

const VIEW_TYPES = [
  { value: 'calendar', label: '캘린더', icon: CalendarBlank },
  { value: 'kanban', label: '보드', icon: Kanban },
  { value: 'chart', label: '차트', icon: ChartLine },
  { value: 'graph', label: '그래프', icon: Graph },
  { value: 'table', label: '표', icon: Table },
  { value: 'list', label: '목록', icon: ListBullets },
];

interface CreateViewModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (view: { id: string; name: string; viewType: string }) => void;
}

export function CreateViewModal({ opened, onClose, onCreated }: CreateViewModalProps) {
  const [name, setName] = useState('');
  const [viewType, setViewType] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim() || !viewType) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          viewType,
          filterConfig: domain ? { domain } : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || '저장에 실패했어요.');
        setSaving(false);
        return;
      }

      onCreated({
        id: json.view.id,
        name: json.view.name,
        viewType: json.view.view_type,
      });

      // Reset
      setName('');
      setViewType(null);
      setDomain(null);
      onClose();
    } catch {
      setError('네트워크 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>새로운 뷰 만들기</Text>}
      centered
      size="sm"
    >
      <Stack gap="md">
        <TextInput
          label="이름"
          placeholder="예: 이번 달 일정"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim() && viewType) handleSave();
          }}
        />

        <Select
          label="보기 방식"
          placeholder="선택해주세요"
          data={VIEW_TYPES.map(vt => ({ value: vt.value, label: vt.label }))}
          value={viewType}
          onChange={setViewType}
        />

        {/* View type preview */}
        {viewType && (
          <Group gap="xs">
            {VIEW_TYPES.filter(vt => vt.value === viewType).map(vt => {
              const Icon = vt.icon;
              return (
                <Group key={vt.value} gap={6}>
                  <Icon size={16} weight="light" color="var(--mantine-color-gray-5)" />
                  <Text fz="xs" c="dimmed">{vt.label} 형태로 데이터를 보여드려요</Text>
                </Group>
              );
            })}
          </Group>
        )}

        <Select
          label="분류 필터"
          description="특정 종류의 데이터만 볼 수 있어요"
          placeholder="전체 (선택 안 함)"
          clearable
          data={[
            { value: 'schedule', label: '일정' },
            { value: 'task', label: '할 일' },
            { value: 'knowledge', label: '지식' },
            { value: 'finance', label: '가계' },
            { value: 'emotion', label: '감정' },
            { value: 'idea', label: '아이디어' },
            { value: 'habit', label: '습관' },
          ]}
          value={domain}
          onChange={setDomain}
        />

        {error && (
          <Text fz="xs" c="red">{error}</Text>
        )}

        <Group justify="flex-end" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>
            취소
          </Button>
          <Button
            color="gray"
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || !viewType}
          >
            만들기
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
