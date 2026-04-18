'use client';

import { useState } from 'react';
import { Box, Stack, Text, Slider, Switch, Group, Collapse, UnstyledButton } from '@mantine/core';
import { CaretDown, CaretRight, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useGraphSettingsStore, DEFAULT_GRAPH_SETTINGS } from '../stores/graphSettingsStore';

export function GraphSettingsPanel() {
  const gs = useGraphSettingsStore();
  const { settings } = gs;
  const setGS = gs.set;
  const [displayOpen, setDisplayOpen] = useState(true);
  const [forceOpen, setForceOpen] = useState(false);

  return (
    <Box>
      {/* Display section */}
      <Box px={10} pt={8}>
        <UnstyledButton onClick={() => setDisplayOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
          {displayOpen ? <CaretDown size={10} weight="bold" /> : <CaretRight size={10} weight="bold" />}
          <Text fz={11} fw={600}>표시</Text>
        </UnstyledButton>
      </Box>
      <Collapse in={displayOpen}>
        <Stack gap={10} px={10} pb={12} pt={8}>
          <Group justify="space-between"><Text fz={11}>라벨</Text><Switch size="xs" checked={settings.showLabels} onChange={(e) => setGS('showLabels', e.currentTarget.checked)} /></Group>
          <Group justify="space-between"><Text fz={11}>글로우</Text><Switch size="xs" checked={settings.showGlow} onChange={(e) => setGS('showGlow', e.currentTarget.checked)} /></Group>
          <Box><Text fz={11} mb={4}>노드 크기</Text><Slider size="xs" min={0.3} max={4} step={0.1} value={settings.nodeSize} onChange={(v) => setGS('nodeSize', v)} styles={{ root: { padding: 0 } }} /></Box>
          <Box><Text fz={11} mb={4}>링크 두께</Text><Slider size="xs" min={0.1} max={2} step={0.1} value={settings.linkThickness} onChange={(v) => setGS('linkThickness', v)} styles={{ root: { padding: 0 } }} /></Box>
          <Group justify="space-between">
            <Text fz={11}>노드 색상</Text>
            <Box style={{ position: 'relative', width: 22, height: 22 }}>
              <Box style={{ width: 22, height: 22, borderRadius: '50%', background: settings.nodeColor, border: '1.5px solid var(--mantine-color-default-border)' }} />
              <input type="color" value={settings.nodeColor} onChange={(e) => setGS('nodeColor', e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: 22, height: 22, opacity: 0, cursor: 'pointer', border: 'none' }} />
            </Box>
          </Group>
        </Stack>
      </Collapse>

      <Box style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }} />

      {/* Force section */}
      <Box px={10} pt={8}>
        <UnstyledButton onClick={() => setForceOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
          {forceOpen ? <CaretDown size={10} weight="bold" /> : <CaretRight size={10} weight="bold" />}
          <Text fz={11} fw={600}>장력</Text>
        </UnstyledButton>
      </Box>
      <Collapse in={forceOpen}>
        <Stack gap={10} px={10} pb={12} pt={8}>
          <Box><Text fz={11} mb={4}>중심 장력</Text><Slider size="xs" min={0} max={0.3} step={0.01} value={settings.centerForce} onChange={(v) => setGS('centerForce', v)} styles={{ root: { padding: 0 } }} /></Box>
          <Box><Text fz={11} mb={4}>반발력</Text><Slider size="xs" min={1} max={100} value={settings.repulsion} onChange={(v) => setGS('repulsion', v)} styles={{ root: { padding: 0 } }} /></Box>
          <Box><Text fz={11} mb={4}>링크 거리</Text><Slider size="xs" min={5} max={150} value={settings.linkDistance} onChange={(v) => setGS('linkDistance', v)} styles={{ root: { padding: 0 } }} /></Box>
          <Box><Text fz={11} mb={4}>링크 장력</Text><Slider size="xs" min={0.01} max={1} step={0.01} value={settings.linkStrength} onChange={(v) => setGS('linkStrength', v)} styles={{ root: { padding: 0 } }} /></Box>
        </Stack>
      </Collapse>

      <Box style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }} />

      {/* Reset */}
      <Group justify="center" px={10} py={8}>
        <UnstyledButton onClick={() => gs.reset()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowCounterClockwise size={12} />
          <Text fz={10} c="dimmed">초기화</Text>
        </UnstyledButton>
      </Group>
    </Box>
  );
}
