'use client';

import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { DEFAULT_LAYOUT_CONFIG, type LayoutConfig } from '@/types/layout-config';
import { useLayoutStyles } from '@/hooks/useLayoutStyles';
import { useState } from 'react';

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

const SWATCHES = [
  'transparent', '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6',
  '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529',
];

function ColorField({ label, path }: { label: string; path: string }) {
  const [value, setValue] = useLayoutValue(path);
  const [showSwatches, setShowSwatches] = useState(false);
  const strValue = typeof value === 'string' ? value : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={strValue || '#000000'}
          onChange={e => setValue(e.target.value)}
          style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, cursor: 'pointer', background: 'none' }}
        />
        <input
          type="text"
          value={strValue}
          onChange={e => setValue(e.target.value)}
          placeholder="#000000"
          style={{ flex: 1, fontSize: 12, padding: '4px 8px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none' }}
        />
        <button
          onClick={() => setShowSwatches(!showSwatches)}
          style={{ fontSize: 10, padding: '4px 6px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          ▼
        </button>
      </div>
      {showSwatches && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {SWATCHES.map(s => (
            <div
              key={s}
              onClick={() => { setValue(s); setShowSwatches(false); }}
              style={{
                width: 20, height: 20, borderRadius: 4, cursor: 'pointer',
                background: s === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px' : s,
                border: '1px solid var(--mantine-color-default-border)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SliderField({ label, path, min, max, step }: {
  label: string; path: string; min: number; max: number; step?: number;
}) {
  const [value, setValue] = useLayoutValue(path);
  return (
    <div>
      <span style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, display: 'block' }}>{label}: {value as number}px</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value as number}
        onChange={e => setValue(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--mantine-color-gray-5)' }}
      />
    </div>
  );
}

const WEIGHT_OPTIONS = [
  { label: '기본', value: '400' },
  { label: '중간', value: '500' },
  { label: '굵게', value: '600' },
  { label: '진하게', value: '700' },
];

function TextStyleSection({ label, prefix }: { label: string; prefix: string }) {
  const [fontSize, setFontSize] = useLayoutValue(`${prefix}.fontSize`);
  const [fontWeight, setFontWeight] = useLayoutValue(`${prefix}.fontWeight`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>크기</span>
          <input
            type="number"
            value={fontSize as number}
            onChange={e => setFontSize(Number(e.target.value))}
            min={8}
            max={72}
            style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>굵기</span>
          <div style={{ display: 'flex', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, overflow: 'hidden' }}>
            {WEIGHT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFontWeight(Number(opt.value))}
                style={{
                  flex: 1, fontSize: 10, padding: '4px 2px', border: 'none', cursor: 'pointer',
                  background: String(fontWeight) === opt.value ? 'var(--mantine-color-gray-6)' : 'transparent',
                  color: String(fontWeight) === opt.value ? '#fff' : 'inherit',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ColorField label="색상" path={`${prefix}.color`} />
    </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>디자인</span>
        <button
          onClick={resetLayoutConfig}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, padding: '2px 8px', border: 'none',
            background: 'transparent', color: 'var(--mantine-color-gray-6)',
            cursor: 'pointer',
          }}
        >
          <ArrowCounterClockwise size={12} />
          기본값
        </button>
      </div>

      {/* 카드 스타일 */}
      <details open>
        <summary style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6, listStyle: 'none' }}>카드</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px 12px' }}>
          <ColorField label="배경색" path="card.backgroundColor" />
          <ColorField label="테두리색" path="card.borderColor" />
          <SliderField label="테두리 두께" path="card.borderWidth" min={0} max={4} />
          <SliderField label="둥글기" path="card.borderRadius" min={0} max={24} />
          <SliderField label="안쪽 여백" path="card.padding" min={4} max={32} />
        </div>
      </details>

      {/* 텍스트 스타일 */}
      <details open>
        <summary style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6, listStyle: 'none' }}>텍스트</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 12px 12px' }}>
          <TextStyleSection label="메인 (한자, 제목)" prefix="textStyles.primary" />
          <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />
          <TextStyleSection label="보조 (음훈, 설명)" prefix="textStyles.secondary" />
          <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />
          <TextStyleSection label="메타 (획수, 급수)" prefix="textStyles.tertiary" />
        </div>
      </details>

      {/* 그리드 */}
      <details open>
        <summary style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6, listStyle: 'none' }}>그리드</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px 12px' }}>
          <SliderField label="컬럼 수" path="grid.columns" min={1} max={12} />
          <SliderField label="간격" path="grid.gap" min={0} max={24} />
        </div>
      </details>

      {/* 필드 표시 */}
      {fields.length > 0 && (
        <details open>
          <summary style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 6, listStyle: 'none' }}>필드 표시</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px 12px' }}>
            {fields.map(f => {
              const visible = (getNested(
                layoutConfig?.fields as Record<string, unknown> | undefined,
                `${f.key}.visible`,
              ) ?? true) as boolean;
              return (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={e => setLayoutField(`fields.${f.key}.visible`, e.currentTarget.checked)}
                  />
                  {f.label}
                </label>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
