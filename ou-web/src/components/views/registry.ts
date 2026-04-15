// 새 뷰 추가 = 이 파일에 등록만. 다른 파일 수정 금지.
import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import type { LayoutConfig } from '@/types/layout-config';

export interface ViewProps {
  nodes: any[];
  filters?: Record<string, any>;
  onSave?: () => void;
  layoutConfig?: LayoutConfig;
}

export const VIEW_REGISTRY: Record<string, ComponentType<ViewProps>> = {
  calendar:        dynamic(() => import('./CalendarView').then(m => m.CalendarView), { ssr: false }),
  task:            dynamic(() => import('./KanbanView').then(m => m.KanbanView), { ssr: false }),
  knowledge_graph: dynamic(() => import('./KnowledgeGraphView').then(m => m.KnowledgeGraphView), { ssr: false }),
  chart:           dynamic(() => import('./ChartView').then(m => m.ChartView), { ssr: false }),
  mindmap:         dynamic(() => import('./MindmapView').then(m => m.MindmapView), { ssr: false }),
  heatmap:         dynamic(() => import('./HeatmapView').then(m => m.HeatmapView), { ssr: false }),
  journal:         dynamic(() => import('./JournalView').then(m => m.JournalView), { ssr: false }),
  timeline:        dynamic(() => import('./TimelineView').then(m => m.TimelineView), { ssr: false }),
  flashcard:       dynamic(() => import('./FlashcardView').then(m => m.FlashcardView), { ssr: false }),
  document:        dynamic(() => import('./DocumentView').then(m => m.DocumentView), { ssr: false }),
  export:          dynamic(() => import('./ExportView').then(m => m.ExportView), { ssr: false }),
  dictionary:      dynamic(() => import('./DictionaryView').then(m => m.DictionaryView), { ssr: false }),
  table:           dynamic(() => import('./TableView').then(m => m.TableView), { ssr: false }),
  pdf:             dynamic(() => import('./PDFView').then(m => m.PDFView), { ssr: false }),
  lecture:         dynamic(() => import('./LectureView').then(m => m.LectureView), { ssr: false }),
  profile:         dynamic(() => import('./ProfileView').then(m => m.ProfileView), { ssr: false }),
  relationship:    dynamic(() => import('./RelationshipView').then(m => m.RelationshipView), { ssr: false }),
  health:          dynamic(() => import('./HealthView').then(m => m.HealthView), { ssr: false }),
  resume:          dynamic(() => import('./ResumeView').then(m => m.ResumeView), { ssr: false }),
  snapshot:        dynamic(() => import('./SnapshotView').then(m => m.SnapshotView), { ssr: false }),
};

/* ── View Meta: 뷰별 동작 속성 ── */

export interface ViewMeta {
  previewOnClick: boolean;
}

export const VIEW_META: Record<string, ViewMeta> = {
  knowledge_graph: { previewOnClick: true },
  task:            { previewOnClick: true },
  timeline:        { previewOnClick: true },
  mindmap:         { previewOnClick: true },
  calendar:        { previewOnClick: true },
  relationship:    { previewOnClick: true },
  heatmap:         { previewOnClick: true },
  flashcard:       { previewOnClick: true },
  health:          { previewOnClick: true },
  table:           { previewOnClick: false },
  dictionary:      { previewOnClick: false },
  document:        { previewOnClick: false },
  journal:         { previewOnClick: false },
  pdf:             { previewOnClick: false },
  lecture:         { previewOnClick: false },
};

export function getViewMeta(viewType: string): ViewMeta {
  return VIEW_META[viewType] ?? { previewOnClick: false };
}

export const DOMAIN_VIEW_MAP: Record<string, string> = {
  schedule:  'calendar',
  task:      'task',
  habit:     'heatmap',
  knowledge: 'knowledge_graph',
  idea:      'mindmap',
  relation:  'relationship',
  emotion:   'journal',
  finance:   'chart',
};
