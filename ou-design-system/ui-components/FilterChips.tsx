'use client';

import { Group, Chip } from '@mantine/core';

interface FilterChipsProps {
  selected: (1 | 2 | 3)[];
  onChange: (selected: (1 | 2 | 3)[]) => void;
}

const importanceLevels: { value: 1 | 2 | 3; label: string }[] = [
  { value: 3, label: '★★★' },
  { value: 2, label: '★★' },
  { value: 1, label: '★' },
];

export function FilterChips({ selected, onChange }: FilterChipsProps) {
  const handleToggle = (val: 1 | 2 | 3) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <Group gap={6}>
      {importanceLevels.map(({ value, label }) => (
        <Chip
          key={value}
          checked={selected.includes(value)}
          onChange={() => handleToggle(value)}
          size="xs"
          variant="outline"
        >
          {label}
        </Chip>
      ))}
    </Group>
  );
}
