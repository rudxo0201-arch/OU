'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWidgetStore } from '@/stores/widgetStore';
import { GRID_PRESETS } from '@/stores/widgetStore';

const DEFAULT_DOCK = ['note', 'calendar', 'task', 'finance', 'habit', 'youtube', 'babylog'];

const ORB_ICONS: Record<string, string> = {
  note:     '✎',
  calendar: '◫',
  task:     '✓',
  finance:  '◈',
  habit:    '⟳',
  idea:     '✦',
  youtube:  '▶',
  babylog:  '◐',
};

const ORB_LABELS: Record<string, string> = {
  note:     '노트',
  calendar: '캘린더',
  task:     '할 일',
  finance:  '가계부',
  habit:    '습관',
  idea:     '아이디어',
  youtube:  'YouTube',
  babylog:  '베이비로그',
};

function DockItem({ slug }: { slug: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const style: CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 'var(--ou-radius-md)',
    background: pressed
      ? 'rgba(0,0,0,0.08)'
      : hovered
        ? 'rgba(0,0,0,0.05)'
        : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    color: hovered ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    transform: pressed ? 'scale(0.88)' : hovered ? 'translateY(-4px) scale(1.10)' : 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    position: 'relative',
    flexShrink: 0,
  };

  return (
    <div
      style={style}
      title={ORB_LABELS[slug] ?? slug}
      onClick={() => router.push(`/orb/${slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {ORB_ICONS[slug] ?? '◎'}

      {hovered && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ou-text-heading)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 500,
          padding: '3px 8px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          letterSpacing: '0.02em',
          zIndex: 1,
        }}>
          {ORB_LABELS[slug] ?? slug}
        </span>
      )}
    </div>
  );
}

function DockDivider() {
  return (
    <div style={{
      width: 1, height: 22,
      background: 'rgba(0,0,0,0.12)',
      margin: '0 4px', flexShrink: 0, alignSelf: 'center',
    }} />
  );
}

function IconBtn({ label, title, onClick }: { label: string; title?: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: hov ? 'rgba(0,0,0,0.08)' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: 'var(--ou-text-secondary)',
        transition: 'all 120ms ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

export function DockBar() {
  const router = useRouter();
  const [dtHovered, setDtHovered] = useState(false);
  const [dtPressed, setDtPressed] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const gridCols = useWidgetStore(s => s.gridCols);
  const setGridSize = useWidgetStore(s => s.setGridSize);
  const resetLayout = useWidgetStore(s => s.resetLayout);

  useEffect(() => {
    const handler = (e: Event) => {
      setEditMode((e as CustomEvent).detail?.active ?? false);
    };
    window.addEventListener('widget-edit-mode-change', handler);
    return () => window.removeEventListener('widget-edit-mode-change', handler);
  }, []);

  const pillContent = editMode ? (
    /* ── 편집 모드 pill ── */
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* 그리드 밀도 선택 */}
      {GRID_PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => setGridSize(p.cols, p.rows)}
          style={{
            padding: '4px 10px', borderRadius: 8,
            background: gridCols === p.cols ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.06)',
            color: gridCols === p.cols ? '#fff' : 'rgba(0,0,0,0.5)',
            fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
            transition: 'all 140ms ease',
          }}
        >
          {p.label}
        </button>
      ))}

      <DockDivider />

      {/* 레이아웃 초기화 */}
      <IconBtn label="↺" title="기본 레이아웃으로 초기화" onClick={resetLayout} />

      {/* 위젯 추가 패널 */}
      <IconBtn
        label="+"
        title="위젯 추가"
        onClick={() => window.dispatchEvent(new CustomEvent('dock-add-widget'))}
      />

      <DockDivider />

      {/* 완료 */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'))}
        style={{
          padding: '6px 16px', borderRadius: 10,
          background: 'rgba(0,0,0,0.88)', color: '#fff',
          fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
      >
        완료
      </button>
    </div>
  ) : (
    /* ── 일반 모드 pill ── */
    <>
      {/* Deep Talk */}
      <div
        onClick={() => router.push('/orb/deep-talk')}
        onMouseEnter={() => setDtHovered(true)}
        onMouseLeave={() => { setDtHovered(false); setDtPressed(false); }}
        onMouseDown={() => setDtPressed(true)}
        onMouseUp={() => setDtPressed(false)}
        title="Deep Talk"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: dtPressed ? 'rgba(0,0,0,0.10)' : dtHovered ? 'rgba(0,0,0,0.06)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          color: dtHovered ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
          cursor: 'pointer',
          transition: 'all 120ms ease',
          transform: dtPressed ? 'scale(0.88)' : dtHovered ? 'translateY(-2px)' : 'none',
          userSelect: 'none', WebkitUserSelect: 'none', flexShrink: 0,
        }}
      >
        ◉
      </div>

      <DockDivider />

      {/* 편집 모드 진입 버튼 */}
      <IconBtn
        label="⊞"
        title="위젯 편집 (Cmd+E)"
        onClick={() => window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'))}
      />
    </>
  );

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      maxWidth: 'calc(100vw - 32px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '6px 12px',
        background: editMode ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${editMode ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.09)'}`,
        borderRadius: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        transition: 'background 200ms ease, border-color 200ms ease',
      }}>
        {pillContent}
      </div>
    </div>
  );
}
