'use client';

import { Box, Text, UnstyledButton, Group, TextInput } from '@mantine/core';
import { useState } from 'react';

interface DataCollectCardProps {
  recorded: string;
  fields: string[];
  onSubmit: (text: string) => void;
}

export function DataCollectCard({ recorded, fields, onSubmit }: DataCollectCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleFieldClick = (field: string) => {
    setActiveField(activeField === field ? null : field);
  };

  const handleSubmit = () => {
    const filled = Object.entries(values)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (filled) {
      onSubmit(filled);
      setValues({});
      setActiveField(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Box
      mt="xs"
      p="sm"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        background: 'rgba(255, 255, 255, 0.02)',
      }}
    >
      <Text fz="xs" c="dimmed" mb={8}>기록됨: {recorded}</Text>

      <Text fz="xs" c="dimmed" mb={6}>추가 정보 (선택)</Text>
      <Group gap={6} mb={activeField ? 8 : 0}>
        {fields.map(field => {
          const hasValue = !!values[field]?.trim();
          return (
            <UnstyledButton
              key={field}
              onClick={() => handleFieldClick(field)}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: 13,
                border: '0.5px solid var(--mantine-color-default-border)',
                background: hasValue
                  ? 'rgba(255, 255, 255, 0.08)'
                  : activeField === field
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'transparent',
                color: hasValue
                  ? 'var(--mantine-color-text)'
                  : 'var(--mantine-color-dimmed)',
                transition: 'all 150ms',
              }}
            >
              {hasValue ? `${field}: ${values[field]}` : `+ ${field}`}
            </UnstyledButton>
          );
        })}
      </Group>

      {activeField && (
        <TextInput
          size="xs"
          placeholder={`${activeField}을(를) 입력하세요`}
          value={values[activeField] ?? ''}
          onChange={e => setValues({ ...values, [activeField]: e.target.value })}
          onKeyDown={handleKeyDown}
          autoFocus
          rightSection={
            values[activeField]?.trim() ? (
              <UnstyledButton
                onClick={handleSubmit}
                style={{ fontSize: 12, color: 'var(--mantine-color-text)', padding: '0 8px' }}
              >
                전송
              </UnstyledButton>
            ) : null
          }
          styles={{
            input: {
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid var(--mantine-color-default-border)',
            },
          }}
        />
      )}
    </Box>
  );
}
