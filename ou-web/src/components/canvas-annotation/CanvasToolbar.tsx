'use client';

import {
  Group, ActionIcon, Tooltip, Divider, ColorSwatch, Text,
  Popover, Stack, SegmentedControl, Slider, Box,
} from '@mantine/core';
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

  const handleToolClick = (tool: CanvasTool) => {
    setTool(activeTool === tool ? null : tool);
  };

  // 현재 색상 프리뷰
  const previewColor = activeTool === 'pen' ? penColor
    : activeTool === 'freeHighlight' ? highlightColor
    : null;
  const previewOpacity = activeTool === 'freeHighlight' ? 0.3 : 1;

  return (
    <Group
      gap="xs" px="sm" py={6}
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ── 도구 버튼 ── */}
      <Tooltip label="펜 (P)">
        <ActionIcon
          variant={activeTool === 'pen' ? 'filled' : 'subtle'}
          color="gray" size="sm"
          onClick={() => handleToolClick('pen')}
        >
          <PencilSimple size={16} weight={activeTool === 'pen' ? 'fill' : 'regular'} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="하이라이트 (H)">
        <ActionIcon
          variant={activeTool === 'freeHighlight' ? 'filled' : 'subtle'}
          color="gray" size="sm"
          onClick={() => handleToolClick('freeHighlight')}
        >
          <HighlighterCircle size={16} weight={activeTool === 'freeHighlight' ? 'fill' : 'regular'} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="지우개 (E)">
        <ActionIcon
          variant={activeTool === 'eraser' ? 'filled' : 'subtle'}
          color="gray" size="sm"
          onClick={() => handleToolClick('eraser')}
        >
          <Eraser size={16} weight={activeTool === 'eraser' ? 'fill' : 'regular'} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="올가미 (L)">
        <ActionIcon
          variant={activeTool === 'lasso' ? 'filled' : 'subtle'}
          color="gray" size="sm"
          onClick={() => handleToolClick('lasso')}
        >
          <Selection size={16} weight={activeTool === 'lasso' ? 'fill' : 'regular'} />
        </ActionIcon>
      </Tooltip>

      <Divider orientation="vertical" />

      {/* ── 색상 프리뷰 + 선택기 ── */}
      {(activeTool === 'pen' || activeTool === 'freeHighlight') && (
        <>
          <Popover position="bottom" withArrow>
            <Popover.Target>
              <Box style={{ cursor: 'pointer' }}>
                <ColorSwatch
                  color={previewColor ?? '#000'}
                  size={20}
                  style={{
                    opacity: previewOpacity,
                    border: '1.5px solid var(--mantine-color-default-border)',
                  }}
                />
              </Box>
            </Popover.Target>
            <Popover.Dropdown p="xs">
              <Group gap={4} maw={160}>
                {(activeTool === 'pen' ? PEN_COLORS : HIGHLIGHT_COLORS_FREE).map(c => (
                  <ColorSwatch
                    key={c} color={c} size={24}
                    style={{
                      cursor: 'pointer',
                      border: (activeTool === 'pen' ? penColor : highlightColor) === c
                        ? '2px solid var(--mantine-color-gray-3)'
                        : '1px solid var(--mantine-color-default-border)',
                      opacity: activeTool === 'freeHighlight' ? 0.5 : 1,
                    }}
                    onClick={() => {
                      if (activeTool === 'pen') setPenColor(c);
                      else setHighlightColor(c);
                    }}
                  />
                ))}
              </Group>
            </Popover.Dropdown>
          </Popover>

          {/* 굵기 선택 */}
          {activeTool === 'pen' && (
            <Group gap={2}>
              {PEN_WIDTHS.map(w => (
                <Tooltip key={w} label={`${w}px`}>
                  <ActionIcon
                    variant={penWidth === w ? 'filled' : 'subtle'}
                    color="gray" size="xs"
                    onClick={() => setPenWidth(w)}
                  >
                    <Box
                      style={{
                        width: Math.max(4, w * 2),
                        height: Math.max(4, w * 2),
                        borderRadius: '50%',
                        background: penWidth === w ? 'white' : 'var(--mantine-color-gray-6)',
                      }}
                    />
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>
          )}

          <Divider orientation="vertical" />
        </>
      )}

      {/* ── 하이라이트 모드 전환 ── */}
      {activeTool === 'freeHighlight' && (
        <>
          <SegmentedControl
            size="xs"
            value={highlightMode}
            onChange={(v) => setHighlightMode(v as HighlightMode)}
            data={[
              { label: <Scribble size={12} />, value: 'free' },
              { label: <TextAa size={12} />, value: 'text' },
            ]}
            styles={{
              root: { background: 'transparent' },
            }}
          />
          <Divider orientation="vertical" />
        </>
      )}

      {/* ── 지우개 설정 ── */}
      {activeTool === 'eraser' && (
        <>
          <SegmentedControl
            size="xs"
            value={eraserMode}
            onChange={(v) => setEraserMode(v as 'stroke' | 'pixel')}
            data={[
              { label: '획', value: 'stroke' },
              { label: '점', value: 'pixel' },
            ]}
            styles={{
              root: { background: 'transparent' },
            }}
          />
          <Box w={80}>
            <Slider
              size="xs" color="gray"
              min={10} max={60} step={5}
              value={eraserSize}
              onChange={setEraserSize}
              label={v => `${v}px`}
            />
          </Box>
          <Divider orientation="vertical" />
        </>
      )}

      {/* ── 선택 액션 (올가미) ── */}
      {activeTool === 'lasso' && selectedCount > 0 && (
        <>
          <Tooltip label="선택 삭제">
            <ActionIcon
              variant="subtle" color="gray" size="sm"
              onClick={() => {
                const ids = Array.from(useCanvasStore.getState().selectedStrokeIds);
                deleteStrokes(ids);
              }}
            >
              <Trash size={16} />
            </ActionIcon>
          </Tooltip>
          <Text fz="xs" c="dimmed">{selectedCount}개 선택</Text>
          <Divider orientation="vertical" />
        </>
      )}

      {/* ── Undo/Redo ── */}
      <Group gap={2} ml="auto">
        <Tooltip label="실행 취소 (⌘Z)">
          <ActionIcon
            variant="subtle" color="gray" size="sm"
            disabled={undoCount === 0}
            onClick={undo}
          >
            <ArrowCounterClockwise size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="다시 실행 (⌘⇧Z)">
          <ActionIcon
            variant="subtle" color="gray" size="sm"
            disabled={redoCount === 0}
            onClick={redo}
          >
            <ArrowClockwise size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
