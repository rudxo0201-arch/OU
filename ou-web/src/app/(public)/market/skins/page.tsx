'use client';

import { Stack, Title, Text, SimpleGrid, Paper, Button, Box, Group, Center } from '@mantine/core';
import { Palette, ArrowLeft } from '@phosphor-icons/react';
import { DEFAULT_THEMES } from '@/lib/graph/skins';
import { useRouter } from 'next/navigation';

export default function SkinsMarketPage() {
  const router = useRouter();

  const handleApply = () => {
    // Navigate to login for unauthenticated users
    router.push('/login?next=/market/skins');
  };

  return (
    <Stack gap="xl" maw={900} mx="auto" p="xl">
      <Group gap="sm">
        <Button
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<ArrowLeft size={16} />}
          onClick={() => router.push('/market')}
          px="xs"
        >
          마켓
        </Button>
      </Group>

      <div>
        <Title order={2}>내 우주 꾸미기</Title>
        <Text c="dimmed" fz="sm">테마를 적용해서 나만의 분위기를 만들어보세요</Text>
      </div>

      {DEFAULT_THEMES.length === 0 && (
        <Center py={80}>
          <Stack align="center" gap="md">
            <Palette size={48} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600}>준비 중이에요</Text>
            <Text fz="sm" c="dimmed">곧 다양한 테마가 추가될 예정이에요.</Text>
          </Stack>
        </Center>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {DEFAULT_THEMES.map(theme => (
          <Paper key={theme.id} p="lg">
            <Stack gap="sm">
              {/* Mini graph preview */}
              <Box
                style={{
                  background: theme.background,
                  height: 120,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '0.5px solid var(--mantine-color-default-border)',
                }}
              >
                <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                  {[0, 1, 2, 3, 4].map(i => {
                    const angle = (i / 5) * Math.PI * 2;
                    const x = 50 + 30 * Math.cos(angle);
                    const y = 50 + 30 * Math.sin(angle);
                    return (
                      <g key={i}>
                        <line x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                          stroke={theme.nodeSkin.color}
                          strokeOpacity={theme.edgeSkin.opacity}
                          strokeWidth="0.5"
                        />
                        <circle cx={`${x}%`} cy={`${y}%`} r="3"
                          fill={theme.nodeSkin.color} opacity={0.8}
                        />
                      </g>
                    );
                  })}
                  <circle cx="50%" cy="50%" r="5" fill={theme.nodeSkin.color} opacity="0.9" />
                </svg>
              </Box>

              <Text fw={600}>{theme.name}</Text>
              <Text fz="xs" c="dimmed">
                {theme.id === 'space' ? '기본 테마' : '클릭해서 적용해보세요'}
              </Text>
              <Button
                variant="light"
                color="gray"
                size="sm"
                fullWidth
                onClick={handleApply}
              >
                {theme.id === 'space' ? '현재 적용 중' : '적용하기'}
              </Button>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
