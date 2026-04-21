// Orb Studio — Zustand 스토어

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StudioElement, Viewport, Guide, CanvasSnapshot } from './types';
import { fromWidgetInstances, toWidgetInstances } from './convert';
import type { WidgetInstance } from '@/components/widgets/types';

const MAX_HISTORY = 50;

interface StudioState {
  // 요소
  elements: StudioElement[];

  // 뷰포트
  viewport: Viewport;

  // 선택
  selectedIds: string[];

  // 스냅
  snapToGrid: boolean;
  gridSize: number; // px

  // 스마트 가이드 (transient, not persisted)
  activeGuides: Guide[];

  // 히스토리 (transient)
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];

  // 액션 — 요소
  addElement: (el: StudioElement) => void;
  removeElements: (ids: string[]) => void;
  updateElement: (id: string, patch: Partial<StudioElement>) => void;
  commitPositions: (updates: Array<{ id: string; x: number; y: number; width: number; height: number }>) => void;
  duplicateSelected: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // 액션 — 선택
  select: (ids: string[], additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // 액션 — 뷰포트
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, centerX: number, centerY: number) => void;
  resetViewport: () => void;

  // 액션 — 스냅
  toggleSnap: () => void;
  setGridSize: (size: number) => void;
  setActiveGuides: (guides: Guide[]) => void;

  // 액션 — 히스토리
  undo: () => void;
  redo: () => void;
  pushSnapshot: () => void;

  // 변환
  importFromWidgets: (
    widgets: WidgetInstance[],
    canvasWidth: number,
    canvasHeight: number,
    gridCols: number,
    gridRows: number,
  ) => void;
  exportToWidgets: (
    canvasWidth: number,
    canvasHeight: number,
    gridCols: number,
    gridRows: number,
  ) => WidgetInstance[];
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      elements: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedIds: [],
      snapToGrid: false,
      gridSize: 20,
      activeGuides: [],
      undoStack: [],
      redoStack: [],

      // 요소
      addElement: (el) => {
        get().pushSnapshot();
        set(s => ({ elements: [...s.elements, el] }));
      },

      removeElements: (ids) => {
        get().pushSnapshot();
        set(s => ({
          elements: s.elements.filter(e => !ids.includes(e.id)),
          selectedIds: s.selectedIds.filter(id => !ids.includes(id)),
        }));
      },

      updateElement: (id, patch) => {
        set(s => ({
          elements: s.elements.map(e => e.id === id ? { ...e, ...patch } : e),
        }));
      },

      commitPositions: (updates) => {
        get().pushSnapshot();
        set(s => ({
          elements: s.elements.map(e => {
            const u = updates.find(u => u.id === e.id);
            return u ? { ...e, ...u } : e;
          }),
        }));
      },

      duplicateSelected: () => {
        const { elements, selectedIds } = get();
        const selected = elements.filter(e => selectedIds.includes(e.id));
        if (selected.length === 0) return;
        get().pushSnapshot();
        const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
        const copies = selected.map((e, i) => ({
          ...e,
          id: `${e.id}_copy_${Date.now()}_${i}`,
          x: e.x + 20,
          y: e.y + 20,
          zIndex: maxZ + i + 1,
        }));
        set(s => ({
          elements: [...s.elements, ...copies],
          selectedIds: copies.map(c => c.id),
        }));
      },

      bringForward: (id) => {
        set(s => {
          const el = s.elements.find(e => e.id === id);
          if (!el) return s;
          const maxZ = s.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
          return {
            elements: s.elements.map(e => e.id === id ? { ...e, zIndex: maxZ + 1 } : e),
          };
        });
      },

      sendBackward: (id) => {
        set(s => {
          const el = s.elements.find(e => e.id === id);
          if (!el) return s;
          const minZ = s.elements.reduce((m, e) => Math.min(m, e.zIndex), 0);
          return {
            elements: s.elements.map(e => e.id === id ? { ...e, zIndex: minZ - 1 } : e),
          };
        });
      },

      // 선택
      select: (ids, additive = false) => {
        set(s => ({
          selectedIds: additive ? s.selectedIds.concat(ids).filter((v, i, a) => a.indexOf(v) === i) : ids,
        }));
      },

      selectAll: () => {
        set(s => ({ selectedIds: s.elements.map(e => e.id) }));
      },

      clearSelection: () => set({ selectedIds: [] }),

      // 뷰포트
      pan: (dx, dy) => {
        set(s => ({ viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy } }));
      },

      zoom: (factor, centerX, centerY) => {
        set(s => {
          const vp = s.viewport;
          const newZoom = Math.min(3, Math.max(0.1, vp.zoom * factor));
          const ratio = newZoom / vp.zoom;
          return {
            viewport: {
              zoom: newZoom,
              x: centerX - (centerX - vp.x) * ratio,
              y: centerY - (centerY - vp.y) * ratio,
            },
          };
        });
      },

      resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

      // 스냅
      toggleSnap: () => set(s => ({ snapToGrid: !s.snapToGrid })),
      setGridSize: (size) => set({ gridSize: size }),
      setActiveGuides: (guides) => set({ activeGuides: guides }),

      // 히스토리
      pushSnapshot: () => {
        set(s => ({
          undoStack: [...s.undoStack.slice(-MAX_HISTORY + 1), { elements: s.elements }],
          redoStack: [],
        }));
      },

      undo: () => {
        const { undoStack, elements } = get();
        if (undoStack.length === 0) return;
        const snapshot = undoStack[undoStack.length - 1];
        set(s => ({
          elements: snapshot.elements,
          undoStack: s.undoStack.slice(0, -1),
          redoStack: [...s.redoStack, { elements }],
          selectedIds: [],
        }));
      },

      redo: () => {
        const { redoStack, elements } = get();
        if (redoStack.length === 0) return;
        const snapshot = redoStack[redoStack.length - 1];
        set(s => ({
          elements: snapshot.elements,
          redoStack: s.redoStack.slice(0, -1),
          undoStack: [...s.undoStack, { elements }],
          selectedIds: [],
        }));
      },

      // 변환
      importFromWidgets: (widgets, canvasWidth, canvasHeight, gridCols, gridRows) => {
        const elements = fromWidgetInstances(widgets, canvasWidth, canvasHeight, gridCols, gridRows);
        set({ elements, selectedIds: [], undoStack: [], redoStack: [] });
      },

      exportToWidgets: (canvasWidth, canvasHeight, gridCols, gridRows) => {
        return toWidgetInstances(get().elements, canvasWidth, canvasHeight, gridCols, gridRows);
      },
    }),
    {
      name: 'ou-studio',
      partialize: (s) => ({
        elements: s.elements,
        viewport: s.viewport,
        snapToGrid: s.snapToGrid,
        gridSize: s.gridSize,
      }),
    },
  ),
);
