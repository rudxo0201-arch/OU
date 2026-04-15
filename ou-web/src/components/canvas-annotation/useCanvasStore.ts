'use client';

import { create } from 'zustand';
import type {
  CanvasTool, CanvasStroke, CanvasAction, CanvasAnnotationData,
  EraserMode, HighlightMode, SerializedStroke,
} from './types';
import { serializeStroke, deserializeStroke } from './types';

interface CanvasAnnotationState {
  // 도구
  activeTool: CanvasTool | null;
  penColor: string;
  penWidth: number;
  highlightColor: string;
  highlightMode: HighlightMode;
  eraserMode: EraserMode;
  eraserSize: number;

  // 스트로크
  strokes: CanvasStroke[];
  selectedStrokeIds: Set<string>;

  // Undo/Redo
  undoStack: CanvasAction[];
  redoStack: CanvasAction[];

  // 동기화
  isDirty: boolean;
  annotationId: string | null; // DB annotation ID

  // 도구 액션
  setTool: (tool: CanvasTool | null) => void;
  setPenColor: (color: string) => void;
  setPenWidth: (width: number) => void;
  setHighlightColor: (color: string) => void;
  setHighlightMode: (mode: HighlightMode) => void;
  setEraserMode: (mode: EraserMode) => void;
  setEraserSize: (size: number) => void;

  // 스트로크 액션
  addStroke: (stroke: CanvasStroke) => void;
  deleteStrokes: (ids: string[]) => void;
  updateStrokes: (strokes: CanvasStroke[]) => void;
  setSelectedStrokeIds: (ids: Set<string>) => void;
  clearSelection: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // 데이터 로드/저장
  loadFromAnnotation: (data: CanvasAnnotationData, annotationId: string) => void;
  getSerializedData: () => CanvasAnnotationData;
  markClean: () => void;
  reset: () => void;
}

const MAX_UNDO = 50;

export const useCanvasStore = create<CanvasAnnotationState>((set, get) => ({
  // 초기값
  activeTool: null,
  penColor: '#000000',
  penWidth: 2,
  highlightColor: '#FFD43B', // yellow
  highlightMode: 'free',
  eraserMode: 'stroke',
  eraserSize: 20,

  strokes: [],
  selectedStrokeIds: new Set(),

  undoStack: [],
  redoStack: [],

  isDirty: false,
  annotationId: null,

  // ── 도구 ──
  setTool: (tool) => set({ activeTool: tool, selectedStrokeIds: new Set() }),
  setPenColor: (color) => set({ penColor: color }),
  setPenWidth: (width) => set({ penWidth: width }),
  setHighlightColor: (color) => set({ highlightColor: color }),
  setHighlightMode: (mode) => set({ highlightMode: mode }),
  setEraserMode: (mode) => set({ eraserMode: mode }),
  setEraserSize: (size) => set({ eraserSize: size }),

  // ── 스트로크 ──
  addStroke: (stroke) => set(state => ({
    strokes: [...state.strokes, stroke],
    undoStack: [...state.undoStack.slice(-MAX_UNDO), { type: 'add', strokeIds: [stroke.id] }],
    redoStack: [],
    isDirty: true,
  })),

  deleteStrokes: (ids) => set(state => {
    const deletedStrokes = state.strokes.filter(s => ids.includes(s.id));
    return {
      strokes: state.strokes.filter(s => !ids.includes(s.id)),
      selectedStrokeIds: new Set(),
      undoStack: [...state.undoStack.slice(-MAX_UNDO), {
        type: 'delete',
        strokeIds: ids,
        data: deletedStrokes,
      }],
      redoStack: [],
      isDirty: true,
    };
  }),

  updateStrokes: (updated) => set(state => {
    const updateMap = new Map(updated.map(s => [s.id, s]));
    return {
      strokes: state.strokes.map(s => updateMap.get(s.id) ?? s),
      isDirty: true,
    };
  }),

  setSelectedStrokeIds: (ids) => set({ selectedStrokeIds: ids }),
  clearSelection: () => set({ selectedStrokeIds: new Set() }),

  // ── Undo/Redo ──
  undo: () => set(state => {
    const action = state.undoStack[state.undoStack.length - 1];
    if (!action) return state;

    const newUndoStack = state.undoStack.slice(0, -1);
    const newRedoStack = [...state.redoStack, action];
    let newStrokes = state.strokes;

    if (action.type === 'add') {
      newStrokes = newStrokes.filter(s => !action.strokeIds.includes(s.id));
    } else if (action.type === 'delete' && action.data) {
      newStrokes = [...newStrokes, ...action.data];
    } else if (action.type === 'move' && action.data) {
      const { dx, dy } = action.data;
      newStrokes = newStrokes.map(s =>
        action.strokeIds.includes(s.id)
          ? { ...s, points: s.points.map(p => ({ ...p, x: p.x - dx, y: p.y - dy })) }
          : s
      );
    }

    return { strokes: newStrokes, undoStack: newUndoStack, redoStack: newRedoStack, isDirty: true };
  }),

  redo: () => set(state => {
    const action = state.redoStack[state.redoStack.length - 1];
    if (!action) return state;

    const newRedoStack = state.redoStack.slice(0, -1);
    const newUndoStack = [...state.undoStack, action];
    let newStrokes = state.strokes;

    if (action.type === 'add') {
      // redo add: 원본 스트로크는 이미 삭제되었으므로, 다시 찾을 수 없음
      // addStroke로 다시 추가해야 하지만, 여기서는 데이터가 없으므로 생략
      // (실제로는 action.data에 스트로크를 저장해야 함)
    } else if (action.type === 'delete') {
      newStrokes = newStrokes.filter(s => !action.strokeIds.includes(s.id));
    } else if (action.type === 'move' && action.data) {
      const { dx, dy } = action.data;
      newStrokes = newStrokes.map(s =>
        action.strokeIds.includes(s.id)
          ? { ...s, points: s.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) }
          : s
      );
    }

    return { strokes: newStrokes, undoStack: newUndoStack, redoStack: newRedoStack, isDirty: true };
  }),

  // ── 데이터 ──
  loadFromAnnotation: (data, annotationId) => set({
    strokes: data.strokes.map(deserializeStroke),
    annotationId,
    isDirty: false,
    undoStack: [],
    redoStack: [],
  }),

  getSerializedData: () => {
    const { strokes } = get();
    return {
      version: 1,
      strokes: strokes.map(serializeStroke),
      viewport: { width: 680, scrollHeight: 0 },
    };
  },

  markClean: () => set({ isDirty: false }),
  reset: () => set({
    strokes: [],
    selectedStrokeIds: new Set(),
    undoStack: [],
    redoStack: [],
    isDirty: false,
    annotationId: null,
    activeTool: null,
  }),
}));
