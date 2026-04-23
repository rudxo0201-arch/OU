'use client';

import { CSSProperties } from 'react';
import { getAllWidgetDefs } from './registry';
import { useWidgetStore } from '@/stores/widgetStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ORB_ROW_HEIGHT = 64;
const DOCK_HEIGHT = 80;

export function ViewPickerPanel({ open, onClose }: Props) {
  const addWidget = useWidgetStore(s => s.addWidget);
  const currentWidgets = useWidgetStore(s => s.pages[s.currentPageIndex]?.widgets ?? []);

  const defs = getAllWidgetDefs().filter(d => d.removable);

  const handleAdd = (type: string, defaultSize: [number, number]) => {
    addWidget({
      id: `${type}-${Date.now()}`,
      type,
      x: 0,
      y: 0,
      w: defaultSize[0],
      h: defaultSize[1],
    });
    onClose();
  };

  const panelStyle: CSSProperties = {
    position: 'fixed',
    right: 0,
    top: ORB_ROW_HEIGHT,
    bottom: DOCK_HEIGHT,
    width: 280,
    background: 'var(--ou-glass-elevated, rgba(255,255,255,0.92))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 14px',
    overflowY: 'auto',
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 240ms cubic-bezier(0.32, 0, 0.2, 1)',
    pointerEvents: open ? 'auto' : 'none',
  };

  return (
    <div style={panelStyle}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ou-text-strong, #111)' }}>
          위젯 추가
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--ou-text-muted, rgba(0,0,0,0.4))',
            padding: '0 4px', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* 위젯 그리드 — 2열 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
      }}>
        {defs.map(def => {
          const alreadyAdded = currentWidgets.some(w => w.type === def.type);
          return (
            <button
              key={def.type}
              onClick={() => handleAdd(def.type, def.defaultSize)}
              style={{
                padding: '12px 8px',
                borderRadius: 10,
                background: 'var(--ou-bg, #f0f0f0)',
                border: 'none',
                boxShadow: alreadyAdded
                  ? 'inset 2px 2px 4px rgba(0,0,0,0.10)'
                  : '2px 2px 6px rgba(0,0,0,0.08), -1px -1px 4px rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                color: alreadyAdded ? 'var(--ou-text-muted, rgba(0,0,0,0.4))' : 'var(--ou-text-body, rgba(0,0,0,0.7))',
                textAlign: 'center',
                transition: 'box-shadow 120ms ease',
              }}
            >
              {def.label}
              {alreadyAdded && (
                <span style={{
                  display: 'block',
                  fontSize: 10,
                  color: 'var(--ou-text-dimmed, rgba(0,0,0,0.3))',
                  marginTop: 2,
                }}>
                  추가됨
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
