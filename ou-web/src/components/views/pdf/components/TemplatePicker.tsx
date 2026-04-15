'use client';

import { Box, Text, Group, UnstyledButton, Tooltip } from '@mantine/core';
import { TEMPLATE_LIST } from '../templates';

interface TemplatePickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TemplatePicker({ selectedId, onSelect }: TemplatePickerProps) {
  return (
    <Group gap={6} py={8} px={4}>
      {TEMPLATE_LIST.map(t => (
        <Tooltip key={t.id} label={t.description} position="bottom" openDelay={400}>
          <UnstyledButton
            onClick={() => onSelect(t.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: selectedId === t.id
                ? '1px solid #333'
                : '1px solid var(--mantine-color-default-border)',
              background: selectedId === t.id ? '#f5f5f5' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Text
              fz={11}
              fw={selectedId === t.id ? 600 : 400}
              c={selectedId === t.id ? '#111' : 'dimmed'}
            >
              {t.name}
            </Text>
          </UnstyledButton>
        </Tooltip>
      ))}
    </Group>
  );
}
