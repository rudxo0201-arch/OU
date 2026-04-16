'use client';

import { useState, useMemo } from 'react';
import { Stack, Text, Box, Modal, Image } from '@mantine/core';
import type { ViewProps } from './registry';

interface GalleryItem {
  id: string;
  title: string;
  imageUrl?: string;
  initial: string;
}

export function GalleryView({ nodes }: ViewProps) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  const items: GalleryItem[] = useMemo(
    () =>
      nodes.map(n => {
        const title = n.domain_data?.title ?? ((n.raw ?? '').slice(0, 40) || 'Untitled');
        return {
          id: n.id,
          title,
          imageUrl: n.domain_data?.image_url ?? n.domain_data?.thumbnail ?? undefined,
          initial: (title[0] ?? '?').toUpperCase(),
        };
      }),
    [nodes],
  );

  if (nodes.length === 0) return null;

  return (
    <Stack gap={0} p="md">
      <Text fz="xs" c="dimmed" mb="md">Gallery</Text>

      <Box
        style={{
          columnCount: 3,
          columnGap: 8,
        }}
      >
        {items.map(item => (
          <Box
            key={item.id}
            onClick={() => setSelected(item)}
            style={{
              breakInside: 'avoid',
              marginBottom: 8,
              border: '0.5px solid var(--mantine-color-default-border)',
              borderRadius: 6,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {item.imageUrl ? (
              <Box style={{ position: 'relative' }}>
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  style={{ display: 'block', width: '100%' }}
                  fallbackSrc={undefined}
                />
                <Box
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 8px 6px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  }}
                >
                  <Text fz={11} c="white" truncate>
                    {item.title}
                  </Text>
                </Box>
              </Box>
            ) : (
              <Box style={{ padding: 16, textAlign: 'center' }}>
                <Text
                  fz={28}
                  fw={700}
                  c="dimmed"
                  style={{ lineHeight: 1, marginBottom: 6 }}
                >
                  {item.initial}
                </Text>
                <Text fz={11} c="dimmed" truncate>
                  {item.title}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Modal
        opened={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
        centered
        size="lg"
        styles={{ header: { borderBottom: '0.5px solid var(--mantine-color-default-border)' } }}
      >
        {selected?.imageUrl ? (
          <Image src={selected.imageUrl} alt={selected.title} style={{ width: '100%' }} />
        ) : (
          <Box style={{ textAlign: 'center', padding: 40 }}>
            <Text fz={64} fw={700} c="dimmed">{selected?.initial}</Text>
            <Text fz="sm" mt="md">{selected?.title}</Text>
          </Box>
        )}
      </Modal>
    </Stack>
  );
}
