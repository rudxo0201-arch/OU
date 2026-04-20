'use client';

import { getAllWidgetDefs } from './registry';
import { useWidgetStore } from '@/stores/widgetStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ViewPickerPanel({ open, onClose }: Props) {
  const addWidget = useWidgetStore(s => s.addWidget);
  const currentWidgets = useWidgetStore(s => s.pages[s.currentPageIndex]?.widgets ?? []);

  if (!open) return null;

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

  const handleEditMode = () => {
    window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'));
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.12)',
          zIndex: 50,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 148,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          borderRadius: 'var(--ou-radius-lg)',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-lg)',
          zIndex: 51,
          padding: '20px 20px 16px',
          animation: 'ou-fade-in 0.18s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ou-text-bright)',
            letterSpacing: '-0.01em',
          }}>
            뷰 추가
          </span>
          <button
            onClick={handleEditMode}
            style={{
              fontSize: 12,
              color: 'var(--ou-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            편집 모드 →
          </button>
        </div>

        {/* View grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
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
                  borderRadius: 'var(--ou-radius-md)',
                  background: 'var(--ou-bg)',
                  border: 'none',
                  boxShadow: alreadyAdded
                    ? 'var(--ou-neu-pressed-sm)'
                    : 'var(--ou-neu-raised-md)',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: alreadyAdded ? 'var(--ou-text-muted)' : 'var(--ou-text-body)',
                  textAlign: 'center',
                  transition: 'box-shadow 120ms ease',
                }}
              >
                {def.label}
                {alreadyAdded && (
                  <span style={{
                    display: 'block',
                    fontSize: 10,
                    color: 'var(--ou-text-disabled)',
                    marginTop: 2,
                  }}>추가됨</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
