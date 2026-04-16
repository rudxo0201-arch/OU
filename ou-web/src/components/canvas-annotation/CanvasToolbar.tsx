'use client';

import { useState } from 'react';
import {
  PencilSimple, HighlighterCircle, Eraser, Selection,
  ArrowCounterClockwise, ArrowClockwise, Trash,
  TextAa, Scribble,
} from '@phosphor-icons/react';
import { useCanvasStore } from './useCanvasStore';
import type { CanvasTool, HighlightMode } from './types';

const PEN_COLORS = [
  '#000000', '#343A40', '#868E96', '#C92A2A',
  '#E67700', '#2B8A3E', '#1864AB', '#862E9C',
];

const HIGHLIGHT_COLORS_FREE = [
  '#FFD43B', '#A9E34B', '#63E6BE', '#74C0FC',
  '#E599F7', '#FFA8A8', '#FFE066', '#D0BFFF',
];

const PEN_WIDTHS = [1, 2, 4, 8];

export function CanvasToolbar() {
  const activeTool = useCanvasStore(s => s.activeTool);
  const penColor = useCanvasStore(s => s.penColor);
  const penWidth = useCanvasStore(s => s.penWidth);
  const highlightColor = useCanvasStore(s => s.highlightColor);
  const highlightMode = useCanvasStore(s => s.highlightMode);
  const eraserMode = useCanvasStore(s => s.eraserMode);
  const eraserSize = useCanvasStore(s => s.eraserSize);
  const selectedCount = useCanvasStore(s => s.selectedStrokeIds.size);
  const undoCount = useCanvasStore(s => s.undoStack.length);
  const redoCount = useCanvasStore(s => s.redoStack.length);

  const {
    setTool, setPenColor, setPenWidth, setHighlightColor,
    setHighlightMode, setEraserMode, setEraserSize,
    undo, redo, deleteStrokes, clearSelection,
  } = useCanvasStore.getState();

  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleToolClick = (tool: CanvasTool) => {
    setTool(activeTool === tool ? null : tool);
    setShowColorPicker(false);
  };

  // 현재 색상 프리뷰
  const previewColor = activeTool === 'pen' ? penColor
    : activeTool === 'freeHighlight' ? highlightColor
    : null;
  const previewOpacity = activeTool === 'freeHighlight' ? 0.3 : 1;

  const toolBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--mantine-color-gray-7)' : 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    color: 'inherit',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ── 도구 버튼 ── */}
      <button title="펜 (P)" style={toolBtnStyle(activeTool === 'pen')} onClick={() => handleToolClick('pen')}>
        <PencilSimple size={16} weight={activeTool === 'pen' ? 'fill' : 'regular'} />
      </button>

      <button title="하이라이트 (H)" style={toolBtnStyle(activeTool === 'freeHighlight')} onClick={() => handleToolClick('freeHighlight')}>
        <HighlighterCircle size={16} weight={activeTool === 'freeHighlight' ? 'fill' : 'regular'} />
      </button>

      <button title="지우개 (E)" style={toolBtnStyle(activeTool === 'eraser')} onClick={() => handleToolClick('eraser')}>
        <Eraser size={16} weight={activeTool === 'eraser' ? 'fill' : 'regular'} />
      </button>

      <button title="올가미 (L)" style={toolBtnStyle(activeTool === 'lasso')} onClick={() => handleToolClick('lasso')}>
        <Selection size={16} weight={activeTool === 'lasso' ? 'fill' : 'regular'} />
      </button>

      <div style={{ width: 1, height: 16, background: 'var(--mantine-color-default-border)', margin: '0 2px' }} />

      {/* ── 색상 프리뷰 + 선택기 ── */}
      {(activeTool === 'pen' || activeTool === 'freeHighlight') && (
        <>
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: previewColor ?? '#000',
                opacity: previewOpacity,
                border: '1.5px solid var(--mantine-color-default-border)',
                cursor: 'pointer',
              }}
            />
            {showColorPicker && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                padding: 8,
                background: 'var(--mantine-color-dark-7)',
                border: '0.5px solid var(--mantine-color-default-border)',
                borderRadius: 8,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                maxWidth: 160,
                zIndex: 20,
              }}>
                {(activeTool === 'pen' ? PEN_COLORS : HIGHLIGHT_COLORS_FREE).map(c => (
                  <div
                    key={c}
                    onClick={() => {
                      if (activeTool === 'pen') setPenColor(c);
                      else setHighlightColor(c);
                      setShowColorPicker(false);
                    }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: (activeTool === 'pen' ? penColor : highlightColor) === c
                        ? '2px solid var(--mantine-color-gray-3)'
                        : '1px solid var(--mantine-color-default-border)',
                      opacity: activeTool === 'freeHighlight' ? 0.5 : 1,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 굵기 선택 */}
          {activeTool === 'pen' && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
              {PEN_WIDTHS.map(w => (
                <button
                  key={w}
                  title={`${w}px`}
                  onClick={() => setPenWidth(w)}
                  style={{
                    background: penWidth === w ? 'var(--mantine-color-gray-7)' : 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                  }}
                >
                  <div
                    style={{
                      width: Math.max(4, w * 2),
                      height: Math.max(4, w * 2),
                      borderRadius: '50%',
                      background: penWidth === w ? 'white' : 'var(--mantine-color-gray-6)',
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          <div style={{ width: 1, height: 16, background: 'var(--mantine-color-default-border)', margin: '0 2px' }} />
        </>
      )}

      {/* ── 하이라이트 모드 전환 ── */}
      {activeTool === 'freeHighlight' && (
        <>
          <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--mantine-color-default-border)' }}>
            <button
              onClick={() => setHighlightMode('free' as HighlightMode)}
              style={{ padding: '2px 8px', border: 'none', background: highlightMode === 'free' ? 'var(--mantine-color-gray-7)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}
            >
              <Scribble size={12} />
            </button>
            <button
              onClick={() => setHighlightMode('text' as HighlightMode)}
              style={{ padding: '2px 8px', border: 'none', background: highlightMode === 'text' ? 'var(--mantine-color-gray-7)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}
            >
              <TextAa size={12} />
            </button>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--mantine-color-default-border)', margin: '0 2px' }} />
        </>
      )}

      {/* ── 지우개 설정 ── */}
      {activeTool === 'eraser' && (
        <>
          <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--mantine-color-default-border)' }}>
            <button
              onClick={() => setEraserMode('stroke')}
              style={{ padding: '2px 8px', border: 'none', background: eraserMode === 'stroke' ? 'var(--mantine-color-gray-7)' : 'transparent', cursor: 'pointer', fontSize: 11, color: 'inherit' }}
            >
              획
            </button>
            <button
              onClick={() => setEraserMode('pixel')}
              style={{ padding: '2px 8px', border: 'none', background: eraserMode === 'pixel' ? 'var(--mantine-color-gray-7)' : 'transparent', cursor: 'pointer', fontSize: 11, color: 'inherit' }}
            >
              점
            </button>
          </div>
          <div style={{ width: 80 }}>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={eraserSize}
              onChange={e => setEraserSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--mantine-color-default-border)', margin: '0 2px' }} />
        </>
      )}

      {/* ── 선택 액션 (올가미) ── */}
      {activeTool === 'lasso' && selectedCount > 0 && (
        <>
          <button
            title="선택 삭제"
            onClick={() => {
              const ids = Array.from(useCanvasStore.getState().selectedStrokeIds);
              deleteStrokes(ids);
            }}
            style={toolBtnStyle(false)}
          >
            <Trash size={16} />
          </button>
          <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>{selectedCount}개 선택</span>
          <div style={{ width: 1, height: 16, background: 'var(--mantine-color-default-border)', margin: '0 2px' }} />
        </>
      )}

      {/* ── Undo/Redo ── */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 2, marginLeft: 'auto' }}>
        <button
          title="실행 취소 (⌘Z)"
          disabled={undoCount === 0}
          onClick={undo}
          style={{ ...toolBtnStyle(false), opacity: undoCount === 0 ? 0.3 : 1, cursor: undoCount === 0 ? 'not-allowed' : 'pointer' }}
        >
          <ArrowCounterClockwise size={14} />
        </button>
        <button
          title="다시 실행 (⌘⇧Z)"
          disabled={redoCount === 0}
          onClick={redo}
          style={{ ...toolBtnStyle(false), opacity: redoCount === 0 ? 0.3 : 1, cursor: redoCount === 0 ? 'not-allowed' : 'pointer' }}
        >
          <ArrowClockwise size={14} />
        </button>
      </div>
    </div>
  );
}
