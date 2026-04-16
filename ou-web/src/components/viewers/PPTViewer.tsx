'use client';

import { useState } from 'react';
import { Box, Text, Group, ActionIcon, Paper, Stack, Badge } from '@mantine/core';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface Slide {
  index: number;
  heading: string;
  body: string;
}

interface PPTViewerProps {
  slides?: Slide[];
  extractedText?: string;
}

export function PPTViewer({ slides, extractedText }: PPTViewerProps) {
  const [current, setCurrent] = useState(0);

  // slides 데이터가 있으면 슬라이드 뷰
  if (slides && slides.length > 0) {
    const slide = slides[current];
    return (
      <Box p="xl" maw={800} mx="auto">
        <Group justify="space-between" mb="md">
          <Badge variant="light" color="gray" size="sm">
            슬라이드 {current + 1} / {slides.length}
          </Badge>
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              color="gray"
              disabled={current === 0}
              onClick={() => setCurrent(c => c - 1)}
            >
              <CaretLeft size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              disabled={current === slides.length - 1}
              onClick={() => setCurrent(c => c + 1)}
            >
              <CaretRight size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <Paper
          p="xl"
          radius="md"
          style={{
            border: '0.5px solid var(--mantine-color-default-border)',
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Stack gap="md">
            {slide.heading && (
              <Text fw={600} fz="lg">{slide.heading}</Text>
            )}
            <Text
              fz="sm"
              style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            >
              {slide.body}
            </Text>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // slides가 없으면 텍스트 폴백
  if (extractedText) {
    return (
      <Box p="xl" maw={700} mx="auto">
        <Text fz="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {extractedText}
        </Text>
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Text c="dimmed">슬라이드 내용을 표시할 수 없었어요.</Text>
    </Box>
  );
}
