'use client';

import { Box, Text } from '@mantine/core';
import type { DecorationConfig } from '@/types/document-template';

interface SectionDividerProps {
  decoration: DecorationConfig;
}

export function SectionDivider({ decoration }: SectionDividerProps) {
  const { type, color } = decoration.sectionDivider;

  switch (type) {
    case 'line':
      return (
        <Box
          my={20}
          style={{
            borderBottom: `0.5px solid ${color}`,
          }}
        />
      );

    case 'dots':
      return (
        <Box my={20} style={{ textAlign: 'center' }}>
          <Text span style={{ color, letterSpacing: '0.5em', fontSize: 12 }}>
            · · ·
          </Text>
        </Box>
      );

    case 'ornament':
      return (
        <Box my={24} style={{ textAlign: 'center' }}>
          <Text span style={{ color, fontSize: 14, letterSpacing: '0.3em' }}>
            ✦ ✦ ✦
          </Text>
        </Box>
      );

    case 'space':
      return <Box my={32} />;

    case 'none':
    default:
      return null;
  }
}
