'use client';
import { CSSProperties, useCallback, useRef } from 'react';

export interface OuSliderProps {
  /** 현재 값. min/max 미지정 시 0-100 퍼센트로 동작 */
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  style?: CSSProperties;
}

export function OuSlider({ value, onChange, min = 0, max = 100, step = 1, style }: OuSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const range = max - min;

  const snapToStep = useCallback((raw: number) => {
    const snapped = Math.round((raw - min) / step) * step + min;
    return Math.min(max, Math.max(min, parseFloat(snapped.toFixed(10))));
  }, [min, max, step]);

  const getValueFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return snapToStep(min + ratio * range);
  }, [value, min, range, snapToStep]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onChange) return;
    e.preventDefault();
    onChange(getValueFromEvent(e));
    const onMove = (ev: MouseEvent) => onChange(getValueFromEvent(ev));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onChange, getValueFromEvent]);

  const pct = range === 0 ? 0 : ((value - min) / range) * 100;

  return (
    <div
      ref={trackRef}
      onMouseDown={handleMouseDown}
      style={{
        width: '100%',
        height: 4,
        borderRadius: 'var(--ou-radius-pill)',
        background: 'var(--ou-surface-muted)',
        border: '1px solid var(--ou-border-subtle)',
        position: 'relative',
        cursor: 'pointer',
        ...style,
      }}
    >
      <div style={{
        height: '100%',
        width: `${pct}%`,
        borderRadius: 'var(--ou-radius-pill)',
        background: 'var(--ou-accent)',
        boxShadow: 'var(--ou-glow-xs)',
      }} />
      <div style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: 'var(--ou-text-heading)',
        boxShadow: 'var(--ou-glow-sm)',
        position: 'absolute',
        top: '50%',
        left: `${pct}%`,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        transition: 'box-shadow var(--ou-transition-fast)',
        flexShrink: 0,
      }} />
    </div>
  );
}
