'use client';

import { useState } from 'react';
import { Stack, Group, Text, Button, Collapse, UnstyledButton, ScrollArea, Box } from '@mantine/core';
import { CaretDown, CaretUp, X } from '@phosphor-icons/react';
import type { HanjaFilter } from '@/types/hanja';

const GRADES = [
  '8급', '7급', '6급', '5급', '준4급', '4급', '준3급', '3급',
  '준2급', '2급', '준1급', '1급', '특급',
];

const IMPORTANCE_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 3, label: '★★★' },
  { value: 2, label: '★★' },
  { value: 1, label: '★' },
];

const CHOSUNG_LIST = [
  'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

interface FilterPanelProps {
  filters: HanjaFilter;
  onChange: (filters: HanjaFilter) => void;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="compact-xs"
      variant={active ? 'filled' : 'default'}
      color={active ? 'dark' : 'gray'}
      radius="xl"
      onClick={onClick}
      styles={{
        root: {
          fontWeight: active ? 600 : 400,
          flexShrink: 0,
          height: 26,
          paddingInline: 10,
          fontSize: 12,
        },
      }}
    >
      {label}
    </Button>
  );
}

function FilterGroup({
  label,
  defaultOpen = false,
  children,
  count,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box>
      <UnstyledButton
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%' }}
      >
        <Group gap={6} py={4}>
          <Text fz={12} fw={500} c="dimmed">
            {label}
          </Text>
          {count > 0 && (
            <Text fz={10} fw={600} c="blue" style={{ lineHeight: 1 }}>
              {count}
            </Text>
          )}
          {open ? (
            <CaretUp size={12} weight="bold" color="var(--mantine-color-dimmed)" />
          ) : (
            <CaretDown size={12} weight="bold" color="var(--mantine-color-dimmed)" />
          )}
        </Group>
      </UnstyledButton>
      <Collapse in={open}>
        <Box pb={6}>{children}</Box>
      </Collapse>
    </Box>
  );
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const selectedGrades = filters.grade ?? [];
  const selectedImportance = filters.importance ?? [];
  const selectedChosung = filters.chosung ?? [];

  const totalActive = selectedGrades.length + selectedImportance.length + selectedChosung.length;

  const toggleGrade = (g: string) => {
    const next = selectedGrades.includes(g)
      ? selectedGrades.filter((v) => v !== g)
      : [...selectedGrades, g];
    onChange({ ...filters, grade: next });
  };

  const toggleImportance = (v: 1 | 2 | 3) => {
    const next = selectedImportance.includes(v)
      ? selectedImportance.filter((x) => x !== v)
      : [...selectedImportance, v];
    onChange({ ...filters, importance: next });
  };

  const toggleChosung = (c: string) => {
    const next = selectedChosung.includes(c)
      ? selectedChosung.filter((v) => v !== c)
      : [...selectedChosung, c];
    onChange({ ...filters, chosung: next });
  };

  const clearAll = () => {
    onChange({ grade: [], importance: [], chosung: [] });
  };

  return (
    <Stack gap={0}>
      {totalActive > 0 && (
        <Group justify="flex-end" pb={4}>
          <UnstyledButton onClick={clearAll}>
            <Group gap={4}>
              <X size={11} weight="bold" color="var(--mantine-color-red-6)" />
              <Text fz={11} c="red">
                필터 초기화
              </Text>
            </Group>
          </UnstyledButton>
        </Group>
      )}

      <FilterGroup label="급수" count={selectedGrades.length} defaultOpen>
        <ScrollArea scrollbarSize={4} type="hover">
          <Group gap={4} wrap="nowrap">
            {GRADES.map((g) => (
              <FilterChip
                key={g}
                label={g}
                active={selectedGrades.includes(g)}
                onClick={() => toggleGrade(g)}
              />
            ))}
          </Group>
        </ScrollArea>
      </FilterGroup>

      <FilterGroup label="중요도" count={selectedImportance.length}>
        <Group gap={4}>
          {IMPORTANCE_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              label={label}
              active={selectedImportance.includes(value)}
              onClick={() => toggleImportance(value)}
            />
          ))}
        </Group>
      </FilterGroup>

      <FilterGroup label="초성 (ㄱㄴㄷ)" count={selectedChosung.length}>
        <Group gap={4}>
          {CHOSUNG_LIST.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={selectedChosung.includes(c)}
              onClick={() => toggleChosung(c)}
            />
          ))}
        </Group>
      </FilterGroup>
    </Stack>
  );
}
