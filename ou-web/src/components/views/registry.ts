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
  dictionary:      dynamic(() => import('./DictionaryView').then(m => m.DictionaryView), { ssr: false }),
  table:           dynamic(() => import('./TableView').then(m => m.TableView), { ssr: false }),
  lecture:         dynamic(() => import('./LectureView').then(m => m.LectureView), { ssr: false }),
  profile:         dynamic(() => import('./ProfileView').then(m => m.ProfileView), { ssr: false }),
  relationship:    dynamic(() => import('./RelationshipView').then(m => m.RelationshipView), { ssr: false }),
  health:          dynamic(() => import('./HealthView').then(m => m.HealthView), { ssr: false }),
  resume:          dynamic(() => import('./ResumeView').then(m => m.ResumeView), { ssr: false }),
  snapshot:        dynamic(() => import('./SnapshotView').then(m => m.SnapshotView), { ssr: false }),
  map:             dynamic(() => import('./MapView').then(m => m.MapView), { ssr: false }),
  code:            dynamic(() => import('./CodeView').then(m => m.CodeView), { ssr: false }),
  terminal:        dynamic(() => import('./TerminalView').then(m => m.TerminalView), { ssr: false }),
  ai_dev:          dynamic(() => import('./AIDevView').then(m => m.AIDevView), { ssr: false }),
  transcript:      dynamic(() => import('./TranscriptView').then(m => m.TranscriptView), { ssr: false }),
  dev_workspace:   dynamic(() => import('./DevWorkspaceView').then(m => m.DevWorkspaceView), { ssr: false }),
  explorer:        dynamic(() => import('./ExplorerView').then(m => m.ExplorerView), { ssr: false }),
  clock:           dynamic(() => import('./ClockView').then(m => m.ClockView), { ssr: false }),
  daily_card:      dynamic(() => import('./DailyCardView').then(m => m.DailyCardView), { ssr: false }),
  export:          dynamic(() => import('./ExportView').then(m => m.ExportView), { ssr: false }),
  org_chart:       dynamic(() => import('./OrgChartView').then(m => m.OrgChartView), { ssr: false }),
  flowchart:       dynamic(() => import('./FlowchartView').then(m => m.FlowchartView), { ssr: false }),
  gantt:           dynamic(() => import('./GanttView').then(m => m.GanttView), { ssr: false }),
  matrix:          dynamic(() => import('./MatrixView').then(m => m.MatrixView), { ssr: false }),
  gallery:         dynamic(() => import('./GalleryView').then(m => m.GalleryView), { ssr: false }),
  dashboard:       dynamic(() => import('./DashboardView').then(m => m.DashboardView), { ssr: false }),
  quiz:            dynamic(() => import('./QuizView').then(m => m.QuizView), { ssr: false }),
  treemap:         dynamic(() => import('./TreemapView').then(m => m.TreemapView), { ssr: false }),
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
  lecture:         { previewOnClick: false },
  map:             { previewOnClick: true },
  code:            { previewOnClick: false },
  terminal:        { previewOnClick: false },
  ai_dev:          { previewOnClick: false },
  transcript:      { previewOnClick: false },
  dev_workspace:   { previewOnClick: false },
  explorer:        { previewOnClick: false },
  clock:           { previewOnClick: false },
  daily_card:      { previewOnClick: false },
  export:          { previewOnClick: false },
  org_chart:       { previewOnClick: false },
  flowchart:       { previewOnClick: false },
  gantt:           { previewOnClick: false },
  matrix:          { previewOnClick: false },
  gallery:         { previewOnClick: true },
  dashboard:       { previewOnClick: false },
  quiz:            { previewOnClick: false },
  treemap:         { previewOnClick: true },
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
  finance:     'chart',
  development: 'dev_workspace',
};
