'use client';

import { useState } from 'react';
import {
  Stack, Text, Paper, Checkbox, Group, NumberInput, Button,
  SimpleGrid, Badge, Loader, ScrollArea, Box,
} from '@mantine/core';
import { Lightning, FloppyDisk, Eye, Sparkle } from '@phosphor-icons/react';

const ALL_ARCHETYPES = [
  '의대생', '프리랜서', '신혼부부', '은퇴자', '뮤지션', '자취생',
  '고3 수험생', '스타트업 대표', '교환학생', '워킹맘', '대학 새내기',
  '요리사', '유튜버', '간호사', '변호사',
];

interface GeneratedScenario {
  title: string;
  story: string;
  tags: string[];
}

export function ScenarioGenerator() {
  const [selected, setSelected] = useState<string[]>([
    '의대생', '신혼부부', '워킹맘',
  ]);
  const [count, setCount] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scenarios, setScenarios] = useState<GeneratedScenario[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const toggle = (arch: string) => {
    setSelected(prev =>
      prev.includes(arch) ? prev.filter(a => a !== arch) : [...prev, arch],
    );
  };

  const selectAll = () => setSelected([...ALL_ARCHETYPES]);
  const deselectAll = () => setSelected([]);

  const generate = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setScenarios([]);
    setResult(null);

    try {
      const res = await fetch('/api/admin/generate-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archetypes: selected, count, preview: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`오류: ${data.error}`);
        return;
      }
      setScenarios(data.scenarios ?? []);
    } catch (e: any) {
      setResult(`요청 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/generate-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archetypes: selected, count, preview: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`오류: ${data.error}`);
        return;
      }
      setResult(data.message);
    } catch (e: any) {
      setResult(`저장 실패: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md">
      <Text fw={600} fz="sm">아키타입 선택</Text>
      <Paper p="md">
        <Group gap="xs" mb="sm">
          <Button variant="subtle" size="xs" color="gray" onClick={selectAll}>전체 선택</Button>
          <Button variant="subtle" size="xs" color="gray" onClick={deselectAll}>전체 해제</Button>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="xs">
          {ALL_ARCHETYPES.map(arch => (
            <Checkbox
              key={arch}
              label={arch}
              checked={selected.includes(arch)}
              onChange={() => toggle(arch)}
              size="sm"
            />
          ))}
        </SimpleGrid>
      </Paper>

      <Group gap="md" align="flex-end">
        <NumberInput
          label="아키타입당 생성 수"
          value={count}
          onChange={(v) => setCount(typeof v === 'number' ? v : 2)}
          min={1}
          max={10}
          w={160}
          size="sm"
        />
        <Text fz="xs" c="dimmed" pb={6}>
          예상: {selected.length * count}개 시나리오
        </Text>
      </Group>

      <Group gap="sm">
        <Button
          leftSection={loading ? <Loader size={14} /> : <Eye size={14} />}
          variant="light"
          color="gray"
          onClick={generate}
          disabled={loading || selected.length === 0}
        >
          {loading ? '생성 중...' : '미리보기'}
        </Button>
        <Button
          leftSection={saving ? <Loader size={14} /> : <FloppyDisk size={14} />}
          variant="filled"
          color="dark"
          onClick={save}
          disabled={saving || selected.length === 0}
        >
          {saving ? '저장 중...' : '바로 생성 + 저장'}
        </Button>
      </Group>

      {/* Preview */}
      {scenarios.length > 0 && (
        <Paper p="md">
          <Group gap="xs" mb="md">
            <Sparkle size={16} weight="fill" />
            <Text fw={600} fz="sm">미리보기 ({scenarios.length}개)</Text>
          </Group>
          <ScrollArea h={400}>
            <Stack gap="sm">
              {scenarios.map((s, i) => (
                <Paper key={i} p="sm" withBorder>
                  <Text fw={600} fz="sm" mb={4}>{s.title}</Text>
                  <Text fz="sm" c="dimmed" mb="xs">{s.story}</Text>
                  <Group gap={4}>
                    {s.tags.map(tag => (
                      <Badge key={tag} variant="light" color="gray" size="xs">{tag}</Badge>
                    ))}
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
          <Box mt="md">
            <Button
              leftSection={saving ? <Loader size={14} /> : <FloppyDisk size={14} />}
              variant="filled"
              color="dark"
              onClick={save}
              disabled={saving}
            >
              {saving ? '저장 중...' : '이 시나리오들 저장'}
            </Button>
          </Box>
        </Paper>
      )}

      {result && (
        <Paper p="sm">
          <Text fz="sm">{result}</Text>
        </Paper>
      )}
    </Stack>
  );
}
