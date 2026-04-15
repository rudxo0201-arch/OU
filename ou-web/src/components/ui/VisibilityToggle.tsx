'use client';

import { SegmentedControl, Group, Text, Tooltip } from '@mantine/core';
import { Lock, Link, Globe, LockSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import type { Visibility } from '@/types';

interface VisibilityToggleProps {
  nodeId: string;
  currentVisibility: Visibility;
  onChange?: (v: Visibility) => void;
  /** domain_data._visibility_locked === true 이면 변경 불가 */
  locked?: boolean;
}

const OPTIONS: { value: Visibility; label: string; icon: React.ElementType; tip: string }[] = [
  { value: 'private', label: '비공개', icon: Lock, tip: '나만 볼 수 있어요' },
  { value: 'link', label: '링크 공유', icon: Link, tip: '링크를 가진 사람만 볼 수 있어요' },
  { value: 'public', label: '전체 공개', icon: Globe, tip: '누구나 볼 수 있어요' },
];

const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: '비공개',
  link: '링크 공유',
  public: '전체 공개',
};

export function VisibilityToggle({ nodeId, currentVisibility, onChange, locked }: VisibilityToggleProps) {
  const [value, setValue] = useState<Visibility>(currentVisibility);
  const [loading, setLoading] = useState(false);

  // 잠김 상태: 읽기 전용 표시
  if (locked) {
    return (
      <Tooltip label="운영 데이터는 비공개로 고정됩니다" position="bottom" withArrow>
        <Group
          gap={6}
          px="sm"
          py={6}
          style={{
            borderRadius: 'var(--mantine-radius-sm)',
            background: 'var(--mantine-color-default)',
            border: '0.5px solid var(--mantine-color-default-border)',
            opacity: 0.7,
            cursor: 'not-allowed',
          }}
        >
          <LockSimple size={16} weight="light" />
          <Text fz="xs" c="dimmed">{VISIBILITY_LABELS[currentVisibility]}</Text>
        </Group>
      </Tooltip>
    );
  }

  const handleChange = async (newValue: string) => {
    const v = newValue as Visibility;
    setValue(v);
    setLoading(true);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: v }),
      });
      if (!res.ok) {
        setValue(currentVisibility);
      } else {
        onChange?.(v);
      }
    } catch {
      setValue(currentVisibility);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SegmentedControl
      value={value}
      onChange={handleChange}
      disabled={loading}
      data={OPTIONS.map(opt => ({
        value: opt.value,
        label: (
          <Tooltip label={opt.tip} position="bottom" withArrow>
            <Group gap={6} wrap="nowrap" justify="center">
              <opt.icon size={16} weight="light" />
              <Text fz="xs">{opt.label}</Text>
            </Group>
          </Tooltip>
        ),
      }))}
      styles={{
        root: {
          background: 'var(--mantine-color-default)',
          border: '0.5px solid var(--mantine-color-default-border)',
        },
      }}
    />
  );
}
