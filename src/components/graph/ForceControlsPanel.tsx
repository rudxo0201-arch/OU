'use client';

import { OuSlider } from '@/components/ds';
import { usePresetStore } from '@/stores/presetStore';
import type { ForceParams } from '@/types';

const CONTROLS: {
  key: keyof ForceParams;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: 'gravity',      label: '중력',      min: -800, max: -50, step: 10  },
  { key: 'linkDistance', label: '간격',      min: 10,   max: 200, step: 5   },
  { key: 'nodeSize',     label: '노드 크기', min: 2,    max: 20,  step: 0.5 },
  { key: 'linkStrength', label: '엣지 인력', min: 0,    max: 1,   step: 0.05 },
];

interface ForceControlsPanelProps {
  onParamChange?: (params: ForceParams) => void;
}

export function ForceControlsPanel({ onParamChange }: ForceControlsPanelProps) {
  const { forceParams, setForceParams } = usePresetStore();

  function handleChange(key: keyof ForceParams, value: number) {
    const next = { ...forceParams, [key]: value };
    setForceParams({ [key]: value });
    onParamChange?.(next);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '12px 16px',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      minWidth: 200,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Force
      </div>
      {CONTROLS.map(({ key, label, min, max, step }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
              {forceParams[key]}
            </span>
          </div>
          <OuSlider
            value={forceParams[key]}
            min={min}
            max={max}
            step={step}
            onChange={(v) => handleChange(key, v)}
          />
        </div>
      ))}
    </div>
  );
}
