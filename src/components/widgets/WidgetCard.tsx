'use client';

import { memo } from 'react';
import type { ScrollPolicy } from './types';
import { getWidgetDef } from './registry';
import styles from './WidgetGrid.module.css';

interface Props {
  widgetId: string;
  type: string;
  removable?: boolean;
  onRemove?: () => void;
  editMode?: boolean;
  isShaking?: boolean;
}

export const WidgetCard = memo(function WidgetCard({ widgetId, type, removable, onRemove, editMode, isShaking }: Props) {
  const def = getWidgetDef(type);
  const scrollable: ScrollPolicy = def?.scrollable ?? 'none';
  const Comp = def?.component;

  const overflowStyle: React.CSSProperties =
    scrollable === 'vertical'   ? { overflowY: 'auto', overflowX: 'hidden' } :
    scrollable === 'horizontal' ? { overflowX: 'auto', overflowY: 'hidden' } :
    scrollable === 'both'       ? { overflow: 'auto' } :
                                  { overflow: 'hidden' };

  // Orb widget: always transparent card. Others: neumorphism raised.
  const isTransparent = type === 'ou-view' || type === 'qsbar';
  const cardClassName = editMode ? styles.cardEdit : (isTransparent ? styles.cardless : styles.cardNormal);

  const animation = isShaking
    ? 'ou-widget-min-hit 0.4s ease'
    : editMode
    ? 'ou-wiggle 1.5s ease-in-out infinite'
    : undefined;

  return (
    <div className={cardClassName} style={animation ? { animation } : undefined}>
      {/* Remove button — only in edit mode */}
      {editMode && removable !== false && onRemove && (
        <button className={styles.removeBtn} onClick={onRemove} title="위젯 제거"
          style={{ opacity: 1 }}>
          ×
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
