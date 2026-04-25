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
  category: 'full' | 'inline';
}

/**
 * Wave 1: 가장 익숙한 기본 내장 뷰
 * 추가 시 이 파일에만 등록. 기존 코드 수정 금지.
 */
export const VIEW_REGISTRY: Record<string, ComponentType<ViewProps>> = {
  // ── Admin ──
  admin:      dynamic(() => import('./AdminView').then(m => m.AdminView), { ssr: false }),

  // ── Wave 1: 기본 내장 ──
  note:       dynamic(() => import('./NoteView').then(m => m.NoteView), { ssr: false }),
  time:       dynamic(() => import('./TimeView').then(m => m.TimeView), { ssr: false }),
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
  shanghanlun: dynamic(() => import('./ShanghanlunView').then(m => m.ShanghanlunView), { ssr: false }),
  boncho:     dynamic(() => import('./BonchoView').then(m => m.BonchoView), { ssr: false }),
  idea:       dynamic(() => import('./IdeaView').then(m => m.IdeaView), { ssr: false }),
  curriculum: dynamic(() => import('./CurriculumView').then(m => m.CurriculumView), { ssr: false }),
  lecture:    dynamic(() => import('./LectureView').then(m => m.LectureView), { ssr: false }),
  scrap:      dynamic(() => import('./ScrapView').then(m => m.ScrapView), { ssr: false }),

  // ── Wave 5: 미디어 ──
  youtube:    dynamic(() => import('./YoutubeView').then(m => m.YoutubeView), { ssr: false }),

  // ── Wave 6: 위치 ──
  map:        dynamic(() => import('./MapView').then(m => m.MapView), { ssr: false }),

  // ── Wave 7: 인라인 — 일정 ──
  'schedule-time':  dynamic(() => import('./inline/ScheduleTimeView').then(m => m.ScheduleTimeView), { ssr: false }),
  'schedule-date':  dynamic(() => import('./inline/ScheduleDateView').then(m => m.ScheduleDateView), { ssr: false }),
  'schedule-range': dynamic(() => import('./inline/ScheduleRangeView').then(m => m.ScheduleRangeView), { ssr: false }),
  'schedule-week':  dynamic(() => import('./inline/ScheduleWeekView').then(m => m.ScheduleWeekView), { ssr: false }),
  'schedule-list':  dynamic(() => import('./inline/ScheduleListView').then(m => m.ScheduleListView), { ssr: false }),

  // ── Wave 8: 인라인 — 가계부 ──
  'finance-amount':   dynamic(() => import('./inline/FinanceAmountView').then(m => m.FinanceAmountView), { ssr: false }),
  'finance-today':    dynamic(() => import('./inline/FinanceTodayView').then(m => m.FinanceTodayView), { ssr: false }),
  'finance-week':     dynamic(() => import('./inline/FinanceWeekView').then(m => m.FinanceWeekView), { ssr: false }),
  'finance-compare':  dynamic(() => import('./inline/FinanceCompareView').then(m => m.FinanceCompareView), { ssr: false }),
  'finance-category': dynamic(() => import('./inline/FinanceCategoryView').then(m => m.FinanceCategoryView), { ssr: false }),

  // ── Wave 9: 인라인 — 할 일 ──
  'task-check': dynamic(() => import('./inline/TaskCheckView').then(m => m.TaskCheckView), { ssr: false }),
  'task-list':  dynamic(() => import('./inline/TaskListView').then(m => m.TaskListView), { ssr: false }),

  // ── Wave 10: 인라인 — 기타 도메인 ──
  'note-card':       dynamic(() => import('./inline/GenericNoteCardView').then(m => m.GenericNoteCardView), { ssr: false }),
  'relation-card':   dynamic(() => import('./inline/RelationCardView').then(m => m.RelationCardView), { ssr: false }),
  'habit-log':       dynamic(() => import('./inline/HabitLogView').then(m => m.HabitLogView), { ssr: false }),
  'habit-streak':    dynamic(() => import('./inline/HabitStreakView').then(m => m.HabitStreakView), { ssr: false }),
  'media-rating':    dynamic(() => import('./inline/MediaRatingView').then(m => m.MediaRatingView), { ssr: false }),
  'location-pin':    dynamic(() => import('./inline/LocationPinView').then(m => m.LocationPinView), { ssr: false }),
  'youtube-timestamp': dynamic(() => import('./inline/YoutubeTimestampView').then(m => m.YoutubeTimestampView), { ssr: false }),
  'health-log':      dynamic(() => import('./inline/HealthLogView').then(m => m.HealthLogView), { ssr: false }),
  'health-med':      dynamic(() => import('./inline/HealthMedView').then(m => m.HealthMedView), { ssr: false }),
  'boncho-herb':     dynamic(() => import('./inline/BonchoHerbView').then(m => m.BonchoHerbView), { ssr: false }),
  'dict-char':       dynamic(() => import('./inline/DictCharView').then(m => m.DictCharView), { ssr: false }),
  'edu-assignment':  dynamic(() => import('./inline/EduAssignmentView').then(m => m.EduAssignmentView), { ssr: false }),

  // ── Wave 11: 주간 시간표 ──
  'edu-timetable': dynamic(() => import('./EduTimetableView').then(m => ({ default: m.EduTimetableView })), { ssr: false }),
};

export const VIEW_META: Record<string, ViewMeta> = {
  // ── full views ──
  admin:      { previewOnClick: false, category: 'full' },
  note:       { previewOnClick: false, category: 'full' },
  time:       { previewOnClick: false, category: 'full' },
  todo:       { previewOnClick: false, category: 'full' },
  calendar:   { previewOnClick: true,  category: 'full' },
  table:      { previewOnClick: false, category: 'full' },
  task:       { previewOnClick: true,  category: 'full' },
  dictionary: { previewOnClick: false, category: 'full' },
  flashcard:  { previewOnClick: true,  category: 'full' },
  timeline:   { previewOnClick: true,  category: 'full' },
  chart:      { previewOnClick: false, category: 'full' },
  heatmap:    { previewOnClick: true,  category: 'full' },
  journal:    { previewOnClick: false, category: 'full' },
  profile:    { previewOnClick: false, category: 'full' },
  idea:       { previewOnClick: false, category: 'full' },
  curriculum: { previewOnClick: false, category: 'full' },
  lecture:    { previewOnClick: false, category: 'full' },
  shanghanlun: { previewOnClick: false, category: 'full' },
  boncho:     { previewOnClick: false, category: 'full' },
  scrap:      { previewOnClick: true,  category: 'full' },
  youtube:    { previewOnClick: false, category: 'full' },
  map:        { previewOnClick: false, category: 'full' },
  // ── inline views ──
  'schedule-time':     { previewOnClick: false, category: 'inline' },
  'schedule-date':     { previewOnClick: false, category: 'inline' },
  'schedule-range':    { previewOnClick: false, category: 'inline' },
  'schedule-week':     { previewOnClick: false, category: 'inline' },
  'schedule-list':     { previewOnClick: false, category: 'inline' },
  'finance-amount':    { previewOnClick: false, category: 'inline' },
  'finance-today':     { previewOnClick: false, category: 'inline' },
  'finance-week':      { previewOnClick: false, category: 'inline' },
  'finance-compare':   { previewOnClick: false, category: 'inline' },
  'finance-category':  { previewOnClick: false, category: 'inline' },
  'task-check':        { previewOnClick: false, category: 'inline' },
  'task-list':         { previewOnClick: false, category: 'inline' },
  'note-card':         { previewOnClick: false, category: 'inline' },
  'relation-card':     { previewOnClick: false, category: 'inline' },
  'habit-log':         { previewOnClick: false, category: 'inline' },
  'habit-streak':      { previewOnClick: false, category: 'inline' },
  'media-rating':      { previewOnClick: false, category: 'inline' },
  'location-pin':      { previewOnClick: false, category: 'inline' },
  'youtube-timestamp': { previewOnClick: false, category: 'inline' },
  'health-log':        { previewOnClick: false, category: 'inline' },
  'health-med':        { previewOnClick: false, category: 'inline' },
  'boncho-herb':       { previewOnClick: false, category: 'inline' },
  'dict-char':         { previewOnClick: false, category: 'inline' },
  'edu-assignment':    { previewOnClick: false, category: 'inline' },
  'edu-timetable':     { previewOnClick: false, category: 'full' },
};

/** 도메인 → 기본 뷰 매핑 */
export const DOMAIN_VIEW_MAP: Record<string, string> = {
  schedule:    'schedule-time',
  task:        'task-check',
  knowledge:   'note-card',
  finance:     'finance-amount',
  habit:       'habit-log',
  idea:        'note-card',
  relation:    'relation-card',
  media:       'media-rating',
  education:   'note-card',
  location:    'location-pin',
  development: 'note-card',
};

/** 뷰 라벨 (한국어) */
export const VIEW_LABELS: Record<string, string> = {
  // 기존 full 뷰
  todo:       '투두 리스트',
  calendar:   '캘린더',
  table:      '테이블',
  task:       '칸반 보드',
  dictionary: '사전',
  flashcard:  '플래시카드',
  timeline:   '타임라인',
  chart:      '차트',
  heatmap:    '히트맵',
  journal:    '감정 일기',
  profile:    '프로필',
  idea:       '아이디어 보드',
  curriculum: '커리큘럼',
  lecture:    '강의',
  shanghanlun: '상한론',
  boncho:     '본초학',
  scrap:      '스크랩',
  youtube:    'YouTube',
  map:        '지도',
  // 인라인 — 일정
  'schedule-time':  '시간 강조 일정',
  'schedule-date':  '날짜 강조 일정',
  'schedule-range': '기간 일정',
  'schedule-week':  '주간 일정',
  'schedule-list':  '일정 목록',
  // 인라인 — 가계부
  'finance-amount':   '금액 강조 지출',
  'finance-today':    '오늘 지출',
  'finance-week':     '주간 지출',
  'finance-compare':  '전월 비교',
  'finance-category': '카테고리별 지출',
  // 인라인 — 할 일
  'task-check': '할 일 체크',
  'task-list':  '할 일 목록',
  // 인라인 — 기타
  'note-card':       '노트 카드',
  'relation-card':   '인물 카드',
  'habit-log':       '습관 기록',
  'habit-streak':    '연속 기록 스트릭',
  'media-rating':    '평점 카드',
  'location-pin':    '장소 핀',
  'youtube-timestamp': '타임스탬프 메모',
  'health-log':      '건강 수치 기록',
  'health-med':      '복약 기록',
  'boncho-herb':     '약재 카드',
  'dict-char':       '한자 카드',
  'edu-assignment':  '과제 마감',
  'edu-timetable':   '주간 시간표',
};
