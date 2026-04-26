'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import {
  Undo2, Globe, Layers, Calendar, Boxes,
  LucideIcon,
} from 'lucide-react';
import { OuOrbIcon } from '@/components/ds';
import { ROUTES } from '@/lib/ou-registry';
import { useHomeViewStore } from '@/stores/homeViewStore';
import { usePresetStore } from '@/stores/presetStore';
import type { Preset } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Layers, Calendar, Boxes,
};

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
      <OuOrbIcon
        icon={Icon}
        variant="filled"
        size={32}
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
      paddingTop: 16,
      gap: 8,
    }}>
      {/* 시스템 — 대시보드 복귀 */}
      <OuOrbIcon
        icon={Undo2}
        variant="outline"
        size={32}
        label="대시보드로 돌아가기"
        animate={isDashboard ? undefined : 'blink-soft 1.5s ease-in-out infinite'}
        onClick={() => router.push(ROUTES.HOME)}
      />

      {/* 구분선 */}
      <div style={{
        width: 32, height: 1,
        background: 'rgba(255,255,255,0.15)',
        margin: '4px 0', flexShrink: 0,
      }} />

      {/* 사용자 프리셋 (시드 4 + 추가 프리셋) */}
      {loaded && presets.map((preset) => (
        <PresetOrbBtn key={preset.id} preset={preset} />
      ))}
    </div>
  );
}
