'use client';

import {
  Stack, Text, Group, ColorInput, Slider, NumberInput,
  SegmentedControl, Switch, Divider, Button, Accordion,
} from '@mantine/core';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { DEFAULT_LAYOUT_CONFIG, type LayoutConfig } from '@/types/layout-config';
import { useLayoutStyles } from '@/hooks/useLayoutStyles';

// layoutConfig에서 점(.) 경로로 값 읽기
function getNested(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (!obj) return undefined;
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// 기본값에서 점(.) 경로로 값 읽기
function getDefault(path: string): unknown {
  return getNested(DEFAULT_LAYOUT_CONFIG as unknown as Record<string, unknown>, path);
}

function useLayoutValue(path: string) {
  const layoutConfig = useViewEditorStore(s => s.layoutConfig);
  const setLayoutField = useViewEditorStore(s => s.setLayoutField);
  const raw = getNested(layoutConfig as Record<string, unknown>, path);
  const value = raw ?? getDefault(path);
  return [value, (v: unknown) => setLayoutField(path, v)] as const;
}

// 사전뷰 기본 필드 목록
const DICTIONARY_FIELDS = [
  { key: 'reading', label: '음훈' },
  { key: 'stroke', label: '획수' },
  { key: 'radical', label: '부수' },
  { key: 'grade', label: '급수' },
];

function ColorField({ label, path }: { label: string; path: string }) {
  const [value, setValue] = useLayoutValue(path);
  return (
    <ColorInput
      label={label}
      size="xs"
      value={typeof value === 'string' ? value : ''}
      onChange={v => setValue(v)}
      format="hex"
      swatches={[
        'transparent', '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6',
        '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529',
      ]}
    />
  );
}

function SliderField({ label, path, min, max, step }: {
  label: string; path: string; min: number; max: number; step?: number;
}) {
  const [value, setValue] = useLayoutValue(path);
  return (
    <div>
      <Text fz="xs" fw={500} mb={2}>{label}: {value as number}px</Text>
      <Slider
        size="xs"
        min={min}
        max={max}
        step={step ?? 1}
        value={value as number}
        onChange={v => setValue(v)}
      />
    </div>
  );
}

function TextStyleSection({ label, prefix }: { label: string; prefix: string }) {
  const [fontSize, setFontSize] = useLayoutValue(`${prefix}.fontSize`);
  const [fontWeight, setFontWeight] = useLayoutValue(`${prefix}.fontWeight`);

  return (
    <Stack gap="xs">
      <Text fz="xs" fw={600} c="dimmed">{label}</Text>
      <Group grow gap="xs">
        <NumberInput
          label="크기"
          size="xs"
          value={fontSize as number}
          onChange={v => setFontSize(v)}
          min={8}
          max={72}
          suffix="px"
        />
        <div>
          <Text fz="xs" fw={500} mb={2}>굵기</Text>
          <SegmentedControl
            size="xs"
            fullWidth
            value={String(fontWeight)}
            onChange={v => setFontWeight(Number(v))}
            data={[
              { label: '기본', value: '400' },
              { label: '중간', value: '500' },
              { label: '굵게', value: '600' },
              { label: '진하게', value: '700' },
            ]}
          />
        </div>
      </Group>
      <ColorField label="색상" path={`${prefix}.color`} />
    </Stack>
  );
}

interface LayoutDesignPanelProps {
  viewType?: string;
}

export function LayoutDesignPanel({ viewType }: LayoutDesignPanelProps) {
  const resetLayoutConfig = useViewEditorStore(s => s.resetLayoutConfig);
  const layoutConfig = useViewEditorStore(s => s.layoutConfig);
  const setLayoutField = useViewEditorStore(s => s.setLayoutField);

  // 뷰 타입별 필드 목록 (확장 가능)
  const fields = viewType === 'dictionary' ? DICTIONARY_FIELDS : [];

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fz="sm" fw={600}>디자인</Text>
        <Button
          variant="subtle"
          size="compact-xs"
          leftSection={<ArrowCounterClockwise size={12} />}
          onClick={resetLayoutConfig}
          color="gray"
        >
          기본값
        </Button>
      </Group>

      <Accordion
        variant="separated"
        multiple
        defaultValue={['card', 'text', 'grid']}
        styles={{
          item: { borderColor: 'var(--mantine-color-default-border)' },
          control: { padding: '8px 12px' },
          panel: { padding: '0 12px 12px' },
        }}
      >
        {/* 카드 스타일 */}
        <Accordion.Item value="card">
          <Accordion.Control>
            <Text fz="xs" fw={600}>카드</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <ColorField label="배경색" path="card.backgroundColor" />
              <ColorField label="테두리색" path="card.borderColor" />
              <SliderField label="테두리 두께" path="card.borderWidth" min={0} max={4} />
              <SliderField label="둥글기" path="card.borderRadius" min={0} max={24} />
              <SliderField label="안쪽 여백" path="card.padding" min={4} max={32} />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* 텍스트 스타일 */}
        <Accordion.Item value="text">
          <Accordion.Control>
            <Text fz="xs" fw={600}>텍스트</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <TextStyleSection label="메인 (한자, 제목)" prefix="textStyles.primary" />
              <Divider />
              <TextStyleSection label="보조 (음훈, 설명)" prefix="textStyles.secondary" />
              <Divider />
              <TextStyleSection label="메타 (획수, 급수)" prefix="textStyles.tertiary" />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* 그리드 */}
        <Accordion.Item value="grid">
          <Accordion.Control>
            <Text fz="xs" fw={600}>그리드</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <SliderField label="컬럼 수" path="grid.columns" min={1} max={12} />
              <SliderField label="간격" path="grid.gap" min={0} max={24} />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* 필드 표시 */}
        {fields.length > 0 && (
          <Accordion.Item value="fields">
            <Accordion.Control>
              <Text fz="xs" fw={600}>필드 표시</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {fields.map(f => {
                  const visible = (getNested(
                    layoutConfig?.fields as Record<string, unknown> | undefined,
                    `${f.key}.visible`,
                  ) ?? true) as boolean;
                  return (
                    <Switch
                      key={f.key}
                      label={f.label}
                      size="xs"
                      checked={visible}
                      onChange={e => setLayoutField(`fields.${f.key}.visible`, e.currentTarget.checked)}
                    />
                  );
                })}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
    </Stack>
  );
}
