'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import type { ScrollPolicy } from './types';
import { getWidgetDef } from './registry';
import styles from './WidgetGrid.module.css';

interface Props {
  widgetId: string;
  type: string;
  removable?: boolean;
  onRemove?: () => void;
  editMode?: boolean;
}

export const WidgetCard = memo(function WidgetCard({ widgetId, type, removable, onRemove, editMode }: Props) {
  const def = getWidgetDef(type);
  const router = useRouter();
  const scrollable: ScrollPolicy = def?.scrollable ?? 'none';
  const Comp = def?.component;

  const overflowStyle: React.CSSProperties =
    scrollable === 'vertical'   ? { overflowY: 'auto', overflowX: 'hidden' } :
    scrollable === 'horizontal' ? { overflowX: 'auto', overflowY: 'hidden' } :
    scrollable === 'both'       ? { overflow: 'auto' } :
                                  { overflow: 'hidden' };

  // Orb widget: always transparent card. Others: neumorphism raised.
  const isOrb = type === 'ou-view';
  const cardClassName = editMode ? styles.cardEdit : (isOrb ? styles.cardless : styles.cardNormal);

  const appSlug = def?.appSlug;

  function handleAppOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (appSlug) router.push(`/orb/${appSlug}`);
  }

  return (
    <div
      className={cardClassName}
      style={{ ...( editMode ? { animation: 'wiggle 1.5s ease-in-out infinite' } : {}), position: 'relative' }}
    >
      {/* Remove button — only in edit mode */}
      {editMode && removable !== false && onRemove && (
        <button className={styles.removeBtn} onClick={onRemove} title="위젯 제거"
          style={{ opacity: 1 }}>
          ×
        </button>
      )}

      {/* 앱 열기 버튼 — 비편집 모드 + appSlug 있을 때만 */}
      {!editMode && appSlug && (
        <button
          onClick={handleAppOpen}
          title={`앱 열기`}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20,
            border: 'none', borderRadius: 4, cursor: 'pointer',
            background: 'transparent',
            color: 'var(--ou-text-disabled)',
            opacity: 0,
            transition: 'opacity 150ms ease',
          }}
          className={styles.appOpenBtn}
        >
          ↗
        </button>
      )}

      {/* Body */}
      <div className={styles.body} style={overflowStyle}>
        {Comp ? <Comp widgetId={widgetId} widgetType={type} /> : <FallbackWidget type={type} />}
      </div>
    </div>
  );
});

function FallbackWidget({ type }: { type: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: 'var(--ou-text-muted)', fontSize: 13,
    }}>
      {type}
    </div>
  );
}
