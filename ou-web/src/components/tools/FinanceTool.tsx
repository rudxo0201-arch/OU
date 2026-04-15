'use client';

import { useState } from 'react';
import { Box, Text, Group, Stack, UnstyledButton, TextInput, Badge } from '@mantine/core';
import { CurrencyCircleDollar, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const CATEGORIES = ['식비', '교통', '쇼핑', '문화', '의료', '교육', '기타'];

function parseFinance(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  const amountMatch = input.match(/(\d[\d,]*)\s*(원|만원)/);
  if (amountMatch) {
    const num = amountMatch[1].replace(/,/g, '');
    const unit = amountMatch[2] === '만원' ? 10000 : 1;
    parsed.amount = (parseInt(num) * unit).toLocaleString() + '원';
  }

  const itemMatch = input.replace(/(\d[\d,]*\s*(원|만원))/, '').replace(/(오늘|어제|점심|저녁|아침)/, '').trim();
  if (itemMatch.length > 1) {
    parsed.item = itemMatch;
  }

  return parsed;
}

export function FinanceTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <Box
      mt="xs"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        animation: 'ou-fade-in 300ms ease',
      }}
    >
      <Group
        gap="xs" px="sm" py={6}
        style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <CurrencyCircleDollar size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">지출</Badge>
        {selectedCategory && <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />}
      </Group>

      <Box px="sm" py="sm">
        <Stack gap={4}>
          {parsed.amount && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">금액</Text>
              <Text fz="sm" fw={600}>{parsed.amount}</Text>
            </Group>
          )}
          {parsed.item && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">항목</Text>
              <Text fz="sm">{parsed.item}</Text>
            </Group>
          )}
          {selectedCategory && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">카테고리</Text>
              <Text fz="sm">{selectedCategory}</Text>
            </Group>
          )}
        </Stack>
      </Box>

      {!selectedCategory && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={4}>카테고리</Text>
          <Group gap={4}>
            {CATEGORIES.map(cat => (
              <UnstyledButton
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  onSubmit(`카테고리: ${cat}`);
                }}
                style={{
                  padding: '2px 10px',
                  borderRadius: 14,
                  fontSize: 11,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-dimmed)',
                  transition: 'all 150ms',
                }}
              >
                {cat}
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}

      <Group
        px="sm" py={6}
        style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <UnstyledButton
          onClick={() => router.push('/my')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mantine-color-dimmed)' }}
        >
          내 우주에서 보기 <ArrowRight size={11} />
        </UnstyledButton>
      </Group>
    </Box>
  );
}

registerTool({
  id: 'finance',
  label: '지출',
  match: (_input, domain) => domain === 'finance',
  parse: parseFinance,
  component: FinanceTool,
});
