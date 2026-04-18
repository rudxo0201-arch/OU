'use client';

import { useState } from 'react';
import { TextInput, ActionIcon, SegmentedControl, Group, Stack } from '@mantine/core';
import { MagnifyingGlass, PencilSimple } from '@phosphor-icons/react';
import { HandwritingPopover } from '@/components/handwriting/HandwritingPopover';

export type SearchMode = 'auto' | 'pronunciation' | 'meaning';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  placeholder?: string;
}

const PLACEHOLDERS: Record<SearchMode, string> = {
  auto: '한자 또는 한자가 포함된 텍스트 입력',
  pronunciation: '음으로 검색 (예: 내, 기)',
  meaning: '뜻으로 검색 (예: 누르다, 간장)',
};

export function SearchInput({
  value,
  onChange,
  searchMode,
  onSearchModeChange,
  placeholder,
}: SearchInputProps) {
  const [hwOpen, setHwOpen] = useState(false);

  const handleHandwritingSelect = (char: string) => {
    onChange(value + char);
  };

  return (
    <Stack gap={8}>
      <TextInput
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder ?? PLACEHOLDERS[searchMode]}
        leftSection={<MagnifyingGlass size={16} weight="light" />}
        rightSection={
          <HandwritingPopover
            isOpen={hwOpen}
            onClose={() => setHwOpen(false)}
            onSelect={handleHandwritingSelect}
            target={
              <ActionIcon variant="subtle" color="gray" onClick={() => setHwOpen((o) => !o)}>
                <PencilSimple size={16} weight="light" />
              </ActionIcon>
            }
          />
        }
        radius="xl"
        styles={{
          input: {
            background: 'var(--mantine-color-default)',
            border: '0.5px solid var(--mantine-color-default-border)',
            fontSize: '14px',
            height: '44px',
          },
        }}
      />
      <SegmentedControl
        size="xs"
        value={searchMode}
        onChange={(v) => onSearchModeChange(v as SearchMode)}
        data={[
          { label: '한자', value: 'auto' },
          { label: '음', value: 'pronunciation' },
          { label: '뜻', value: 'meaning' },
        ]}
        styles={{
          root: { alignSelf: 'flex-start' },
        }}
      />
    </Stack>
  );
}
