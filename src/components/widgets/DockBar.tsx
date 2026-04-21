'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type Icon as PhosphorIcon } from '@phosphor-icons/react';
import { useHomeStore } from '@/stores/homeStore';
import { getAppDef } from '@/lib/apps/registry';
import { resolveAppIcon } from '@/lib/apps/icon-map';

const BASE_SIZE = 40;
const ORB_SIZE  = 52;
const MAX_SCALE = 1.45;
const SPREAD    = 2.2;

function getMagnification(index: number, mouseIndex: number): number {
  if (mouseIndex < 0) return 1;
  const dist = Math.abs(index - mouseIndex);
  if (dist > SPREAD) return 1;
  const t = 1 - dist / SPREAD;
  return 1 + (MAX_SCALE - 1) * Math.cos((1 - t) * Math.PI / 2) ** 2;
}

function OrbIcon() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      background: 'var(--ou-accent)',
      boxShadow: '0 0 8px 2px color-mix(in srgb, var(--ou-accent) 50%, transparent)',
    }} />
  );
}

type DockItem =
  | { kind: 'app'; slug: string; label: string; icon: string; route: string }
  | { kind: 'orb' };

function buildItems(dockSlugs: string[]): DockItem[] {
  const apps: DockItem[] = dockSlugs
    .map(slug => {
      const def = getAppDef(slug);
      if (!def) return null;
      return {
        kind: 'app' as const,
        slug: def.slug,
        label: def.label.replace('OU ', ''),
        icon: def.icon,
        route: def.route ?? `/app/${def.slug}`,
      };
    })
    .filter((x): x is DockItem & { kind: 'app' } => x !== null);

  const mid = Math.floor(apps.length / 2);
  return [...apps.slice(0, mid), { kind: 'orb' as const }, ...apps.slice(mid)];
}

export function DockBar({ onDropToGrid }: { onDropToGrid?: (slug: string) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dockRef   = useRef<HTMLDivElement>(null);
  const itemRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef    = useRef<number | null>(null);
  const mouseXRef = useRef(-1);
  const router    = useRouter();

  const dockSlugs = useHomeStore(s => s.dockSlugs);
  const hydrated  = useHomeStore(s => s._hasHydrated);
  const addToDock = useHomeStore(s => s.addToDock);

  const items = hydrated
    ? buildItems(dockSlugs)
    : buildItems(['note', 'calendar', 'todo', 'finance', 'habit', 'idea']);

  // DOM 직접 조작으로 magnification 업데이트 (React re-render 없음)
  const updateMagnification = useCallback((mouseIndex: number) => {
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const item = items[i];
      const isOrb = item?.kind === 'orb';
      const baseSize = isOrb ? ORB_SIZE : BASE_SIZE;
      const scale = getMagnification(i, mouseIndex);
      const size = baseSize * scale;
      const isHovered = Math.abs(i - mouseIndex) < 0.5;
      const liftY = isHovered && mouseIndex >= 0
        ? -4 * (scale - 1) / (MAX_SCALE - 1)
        : 0;

      // 래퍼 div transform
      el.style.transform = `translateY(${liftY}px)`;

      // 버튼 크기
      const btn = el.querySelector('button') as HTMLButtonElement | null;
      if (btn) {
        btn.style.width  = `${size}px`;
        btn.style.height = `${size}px`;
        btn.style.boxShadow = isHovered && mouseIndex >= 0
          ? 'var(--ou-neu-raised-lg)'
          : 'var(--ou-neu-raised-md)';
      }

      // 아이콘 크기 (svg)
      const svg = el.querySelector('svg') as SVGElement | null;
      if (svg) {
        const iconSize = Math.round(size * 0.42);
        svg.setAttribute('width', String(iconSize));
        svg.setAttribute('height', String(iconSize));
      }

      // 툴팁 표시
      const tooltip = el.querySelector('[data-tooltip]') as HTMLElement | null;
      if (tooltip) {
        tooltip.style.opacity = isHovered && mouseIndex >= 0 ? '1' : '0';
      }
    });
  }, [items]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseXRef.current = e.clientX;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!dockRef.current) return;
      const rect = dockRef.current.getBoundingClientRect();
      const x = mouseXRef.current - rect.left;
      updateMagnification(x / (rect.width / items.length));
    });
  }, [items.length, updateMagnification]);

  const handleMouseLeave = useCallback(() => {
    mouseXRef.current = -1;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    updateMagnification(-1);
  }, [updateMagnification]);

  // items 변경 시 초기 크기 설정
  useEffect(() => {
    updateMagnification(-1);
  }, [items.length, updateMagnification]);

  const handleClick = useCallback((item: DockItem) => {
    if (item.kind === 'orb') router.push('/orb');
    else router.push(item.route);
  }, [router]);

  const handleDockDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('application/ou-app');
    if (!raw) return;
    const { slug, source } = JSON.parse(raw) as { slug?: string; source: 'dock' | 'grid' };
    if (source === 'grid' && slug) addToDock(slug);
  }, [addToDock]);

  return (
    <div
      ref={dockRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDockDrop}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: 6,
        padding: '10px 20px 12px',
        borderRadius: 'var(--ou-radius-lg)',
        background: 'var(--ou-bg)',
        boxShadow: isDragOver
          ? 'var(--ou-neu-raised-lg), 0 0 0 2px var(--ou-border-subtle)'
          : 'var(--ou-neu-raised-lg)',
        transition: 'box-shadow 150ms ease',
      }}
    >
      {items.map((item, i) => {
        const isOrb  = item.kind === 'orb';
        const slug   = item.kind === 'app' ? item.slug : undefined;
        const Icon: PhosphorIcon | null = item.kind === 'app' ? resolveAppIcon(item.icon) : null;
        const label  = item.kind === 'app' ? item.label : 'ORB';
        const baseSize = isOrb ? ORB_SIZE : BASE_SIZE;

        return (
          <div
            key={isOrb ? 'orb' : item.slug}
            ref={el => { itemRefs.current[i] = el; }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative',
              // transition은 CSS로 — transform에만 적용 (width/height는 버튼에서)
              transition: 'transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform',
            }}
          >
            {/* 툴팁 — 항상 DOM에 존재, opacity로 토글 */}
            <div
              data-tooltip
              style={{
                position: 'absolute', bottom: '100%', left: '50%',
                transform: 'translateX(-50%)', marginBottom: 8,
                padding: '3px 9px', borderRadius: 6,
                background: 'var(--ou-bg)', border: '1px solid var(--ou-border-subtle)',
                fontSize: 11, color: 'var(--ou-text-body)', whiteSpace: 'nowrap',
                pointerEvents: 'none',
                opacity: 0,
                transition: 'opacity 80ms ease',
              }}
            >
              {label}
            </div>

            <button
              draggable={!isOrb}
              onDragStart={!isOrb && slug ? (e) => {
                e.dataTransfer.setData('application/ou-app', JSON.stringify({ slug, source: 'dock' }));
                e.dataTransfer.effectAllowed = 'copy';
              } : undefined}
              onClick={() => handleClick(item)}
              style={{
                width: baseSize, height: baseSize,
                borderRadius: '50%',
                background: 'var(--ou-bg)',
                border: 'none',
                boxShadow: 'var(--ou-neu-raised-md)',
                // width/height transition은 DOM 직접 조작과 일치하도록 여기서 선언
                transition: 'width 120ms cubic-bezier(0.34,1.56,0.64,1), height 120ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 120ms ease',
                cursor: 'pointer',
                flexShrink: 0,
                color: 'var(--ou-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                willChange: 'width, height',
              }}
            >
              {isOrb
                ? <OrbIcon />
                : Icon && <Icon size={Math.round(baseSize * 0.42)} weight="regular" />
              }
            </button>

            <span style={{
              fontSize: 9,
              color: isOrb ? 'var(--ou-text-muted)' : 'var(--ou-text-disabled)',
              marginTop: 3, letterSpacing: '0.3px',
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
