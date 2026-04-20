// 새 뷰 추가 = 이 파일에 등록만. 다른 파일 수정 금지.
import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import type { LayoutConfig } from '@/types/layout-config';

export interface ViewProps {
  nodes: any[];
  filters?: Record<string, any>;
  onSave?: () => void;
  layoutConfig?: LayoutConfig;
  inline?: boolean;
}

export interface ViewMeta {
  previewOnClick: boolean;
}

/**
 * Wave 1: 가장 익숙한 기본 내장 뷰
 * 추가 시 이 파일에만 등록. 기존 코드 수정 금지.
 */
export const VIEW_REGISTRY: Record<string, ComponentType<ViewProps>> = {
  // ── Wave 1: 기본 내장 ──
  todo:       dynamic(() => import('./TodoView').then(m => m.TodoView), { ssr: false }),
  calendar:   dynamic(() => import('./CalendarView').then(m => m.CalendarView), { ssr: false }),
  table:      dynamic(() => import('./TableView').then(m => m.TableView), { ssr: false }),
  task:       dynamic(() => import('./KanbanView').then(m => m.KanbanView), { ssr: false }),
  dictionary: dynamic(() => import('./DictionaryView').then(m => m.DictionaryView), { ssr: false }),

  // ── Wave 2: 학습 ──
  flashcard:  dynamic(() => import('./FlashcardView').then(m => m.FlashcardView), { ssr: false }),
  timeline:   dynamic(() => import('./TimelineView').then(m => m.TimelineView), { ssr: false }),

  // ── Wave 3: 개인 관리 ──
  chart:      dynamic(() => import('./ChartView').then(m => m.ChartView), { ssr: false }),
  heatmap:    dynamic(() => import('./HeatmapView').then(m => m.HeatmapView), { ssr: false }),
  journal:    dynamic(() => import('./JournalView').then(m => m.JournalView), { ssr: false }),
  profile:    dynamic(() => import('./ProfileView').then(m => m.ProfileView), { ssr: false }),

  // ── Wave 4: 학습/수집 ──
  boncho:     dynamic(() => import('./BonchoView').then(m => m.BonchoView), { ssr: false }),
  idea:       dynamic(() => import('./IdeaView').then(m => m.IdeaView), { ssr: false }),
  curriculum: dynamic(() => import('./CurriculumView').then(m => m.CurriculumView), { ssr: false }),
  lecture:    dynamic(() => import('./LectureView').then(m => m.LectureView), { ssr: false }),
  scrap:      dynamic(() => import('./ScrapView').then(m => m.ScrapView), { ssr: false }),

  // ── Wave 5: 미디어 ──
  youtube:    dynamic(() => import('./YoutubeView').then(m => m.YoutubeView), { ssr: false }),

  // ── Wave 6: 위치 ──
  map:        dynamic(() => import('./MapView').then(m => m.MapView), { ssr: false }),
};

export const VIEW_META: Record<string, ViewMeta> = {
  todo:       { previewOnClick: false },
  calendar:   { previewOnClick: true },
  table:      { previewOnClick: false },
  task:       { previewOnClick: true },
  dictionary: { previewOnClick: false },
  flashcard:  { previewOnClick: true },
  timeline:   { previewOnClick: true },
  chart:      { previewOnClick: false },
  heatmap:    { previewOnClick: true },
  journal:    { previewOnClick: false },
  profile:    { previewOnClick: false },
  idea:       { previewOnClick: false },
  curriculum: { previewOnClick: false },
  lecture:    { previewOnClick: false },
  boncho:     { previewOnClick: false },
  scrap:      { previewOnClick: true },
  youtube:    { previewOnClick: false },
  map:        { previewOnClick: false },
};

/** 도메인 → 기본 뷰 매핑 */
export const DOMAIN_VIEW_MAP: Record<string, string> = {
  schedule: 'calendar',
  task: 'task',
  knowledge: 'table',
  finance: 'chart',
  habit: 'heatmap',
  emotion: 'journal',
  idea: 'idea',
  media: 'scrap',
  education: 'curriculum',
  location: 'map',
};

/** 뷰 라벨 (한국어) */
export const VIEW_LABELS: Record<string, string> = {
  todo: '투두 리스트',
  calendar: '캘린더',
  table: '테이블',
  task: '칸반 보드',
  dictionary: '사전',
  flashcard: '플래시카드',
  timeline: '타임라인',
  chart: '지출 차트',
  heatmap: '습관 히트맵',
  journal: '감정 일기',
  profile: '프로필',
  idea: '아이디어',
  curriculum: '커리큘럼',
  lecture: '강의',
  boncho: '본초학',
  scrap: '스크랩',
  youtube: 'YouTube',
  map: '지도',
};
