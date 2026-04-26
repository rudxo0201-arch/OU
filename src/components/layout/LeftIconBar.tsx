'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Undo2, Globe, Layers, Calendar, Boxes, Plus,
  LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/lib/ou-registry';
import { useHomeViewStore } from '@/stores/homeViewStore';
import { usePresetStore } from '@/stores/presetStore';
import type { Preset } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Layers, Calendar, Boxes,
};

const ICON_SIZE = 40;

function OrbBtn({
  icon: Icon,
  label,
  variant = 'filled',
  animate,
  dashed,
  onClick,
}: {
  icon: LucideIcon;
  label?: string;
  variant?: 'filled' | 'outline' | 'ghost';
  animate?: string;
  dashed?: boolean;
  onClick?: () => void;
}) {
  const base: React.CSSProperties = {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    flexShrink: 0,
    padding: 0,
    transition: 'filter 160ms ease',
    ...(animate ? { animation: animate } : {}),
    ...(variant === 'filled'
      ? { background: '#fff', color: '#111', border: 'none' }
      : variant === 'outline'
      ? { background: 'transparent', color: '#fff', border: `1.5px solid rgba(255,255,255,0.8)` }
      : { background: 'transparent', color: 'rgba(255,255,255,0.5)', border: `1.5px dashed rgba(255,255,255,0.35)` }),
  };

  return (
    <button title={label} onClick={onClick} style={base} type="button">
      <Icon size={18} strokeWidth={1.5} />
    </button>
  );
}

function PresetOrbBtn({ preset }: { preset: Preset }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const Icon = ICON_MAP[preset.icon] ?? Globe;

  function handleClick() {
    const view = preset.kind === 'graph' ? 'graph' : 'tree-preview';
    let url = `${ROUTES.HOME}?view=${view}&preset=${preset.id}`;
    if (preset.kind === 'tree' && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      url += `&ox=${Math.round(rect.right)}&oy=${Math.round(rect.top + rect.height / 2)}`;
    }
    router.push(url);
  }

  return (
    <div ref={wrapRef}>
      <OrbBtn
        icon={Icon}
        variant="filled"
        label={preset.label}
        onClick={handleClick}
      />
    </div>
  );
}

export function LeftIconBar() {
  const router = useRouter();
  const { activeView } = useHomeViewStore();
  const { presets, loaded } = usePresetStore();

  const isDashboard = activeView === 'dashboard';

  return (
    <div style={{
      position: 'fixed',
      left: 0, top: 56, bottom: 0,
      width: 60,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    }}>
      {/* 프리셋 추가 placeholder (비활성) */}
      <OrbBtn icon={Plus} variant="ghost" label="프리셋 추가" />

      {/* 구분선 */}
      <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.12)' }} />

      {/* 대시보드 복귀 */}
      <OrbBtn
        icon={Undo2}
        variant="filled"
        label="대시보드로"
        animate={isDashboard ? undefined : 'blink-soft 1.5s ease-in-out infinite'}
        onClick={() => router.push(ROUTES.HOME)}
      />

      {/* 사용자 프리셋 */}
      {loaded && presets.map((preset) => (
        <PresetOrbBtn key={preset.id} preset={preset} />
      ))}
    </div>
  );
}
