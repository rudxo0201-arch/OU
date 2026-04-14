'use client';

import { Group, Text, Badge, Box } from '@mantine/core';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

interface PageHeaderProps {
  icon?: PhosphorIcon;
  title: string;
  count?: number;
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, count, actions }: PageHeaderProps) {
  return (
    <Box
      pb="sm"
      mb="md"
      style={{
        borderBottom: '0.5px solid var(--mantine-color-default-border)',
        position: 'sticky',
        top: 0,
        background: 'var(--mantine-color-body)',
        zIndex: 50,
        paddingTop: 'var(--mantine-spacing-lg)',
      }}
    >
      <Group justify="space-between">
        <Group gap={10}>
          {Icon && <Icon size={22} weight="light" />}
          <Text fz={20} fw={600}>
            {title}
          </Text>
          {count !== undefined && (
            <Badge variant="default" size="md" radius="xl" styles={{
              root: {
                fontWeight: 400,
                fontSize: '11px',
                border: '0.5px solid var(--mantine-color-default-border)',
              },
            }}>
              {count.toLocaleString()}
            </Badge>
          )}
        </Group>
        {actions && <Group gap="xs">{actions}</Group>}
      </Group>
    </Box>
  );
}
