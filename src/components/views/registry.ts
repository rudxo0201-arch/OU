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
  'schedule-time':     dynamic(() => import('./inline/ScheduleTimeView').then(m => m.ScheduleTimeView), { ssr: false }),
  'schedule-date':     dynamic(() => import('./inline/ScheduleDateView').then(m => m.ScheduleDateView), { ssr: false }),
  'schedule-range':    dynamic(() => import('./inline/ScheduleRangeView').then(m => m.ScheduleRangeView), { ssr: false }),
  'schedule-today':    dynamic(() => import('./inline/ScheduleTodayView').then(m => m.ScheduleTodayView), { ssr: false }),
  'schedule-tomorrow': dynamic(() => import('./inline/ScheduleTomorrowView').then(m => m.ScheduleTomorrowView), { ssr: false }),
  'schedule-week':     dynamic(() => import('./inline/ScheduleWeekView').then(m => m.ScheduleWeekView), { ssr: false }),
  'schedule-around':   dynamic(() => import('./inline/ScheduleAroundView').then(m => m.ScheduleAroundView), { ssr: false }),

  // ── Wave 8: 인라인 — 가계부 ──
  'finance-amount':   dynamic(() => import('./inline/FinanceAmountView').then(m => m.FinanceAmountView), { ssr: false }),
  'finance-balance':  dynamic(() => import('./inline/FinanceBalanceView').then(m => m.FinanceBalanceView), { ssr: false }),
  'finance-today':    dynamic(() => import('./inline/FinanceTodayView').then(m => m.FinanceTodayView), { ssr: false }),
  'finance-week':     dynamic(() => import('./inline/FinanceWeekView').then(m => m.FinanceWeekView), { ssr: false }),
  'finance-compare':  dynamic(() => import('./inline/FinanceCompareView').then(m => m.FinanceCompareView), { ssr: false }),
  'finance-category': dynamic(() => import('./inline/FinanceCategoryView').then(m => m.FinanceCategoryView), { ssr: false }),

  // ── Wave 9: 인라인 — 할 일 ──
  'task-check':    dynamic(() => import('./inline/TaskCheckView').then(m => m.TaskCheckView), { ssr: false }),
  'task-deadline': dynamic(() => import('./inline/TaskDeadlineView').then(m => m.TaskDeadlineView), { ssr: false }),
  'task-today':    dynamic(() => import('./inline/TaskTodayView').then(m => m.TaskTodayView), { ssr: false }),
  'task-overdue':  dynamic(() => import('./inline/TaskOverdueView').then(m => m.TaskOverdueView), { ssr: false }),
  'task-week':     dynamic(() => import('./inline/TaskWeekView').then(m => m.TaskWeekView), { ssr: false }),

  // ── Wave 10: 인라인 — 기타 도메인 ──
  'idea-card':       dynamic(() => import('./inline/IdeaCardView').then(m => m.IdeaCardView), { ssr: false }),
  'relation-card':   dynamic(() => import('./inline/RelationCardView').then(m => m.RelationCardView), { ssr: false }),
  'habit-log':       dynamic(() => import('./inline/HabitLogView').then(m => m.HabitLogView), { ssr: false }),
  'habit-streak':    dynamic(() => import('./inline/HabitStreakView').then(m => m.HabitStreakView), { ssr: false }),
  'knowledge-note':  dynamic(() => import('./inline/KnowledgeNoteView').then(m => m.KnowledgeNoteView), { ssr: false }),
  'media-card':      dynamic(() => import('./inline/MediaCardView').then(m => m.MediaCardView), { ssr: false }),
  'media-rating':    dynamic(() => import('./inline/MediaRatingView').then(m => m.MediaRatingView), { ssr: false }),
  'dev-note':        dynamic(() => import('./inline/DevNoteView').then(m => m.DevNoteView), { ssr: false }),
  'location-pin':    dynamic(() => import('./inline/LocationPinView').then(m => m.LocationPinView), { ssr: false }),
  'youtube-card':    dynamic(() => import('./inline/YoutubeCardView').then(m => m.YoutubeCardView), { ssr: false }),
  'youtube-timestamp': dynamic(() => import('./inline/YoutubeTimestampView').then(m => m.YoutubeTimestampView), { ssr: false }),
  'health-log':      dynamic(() => import('./inline/HealthLogView').then(m => m.HealthLogView), { ssr: false }),
  'health-symptom':  dynamic(() => import('./inline/HealthSymptomView').then(m => m.HealthSymptomView), { ssr: false }),
  'health-med':      dynamic(() => import('./inline/HealthMedView').then(m => m.HealthMedView), { ssr: false }),
  'boncho-herb':     dynamic(() => import('./inline/BonchoHerbView').then(m => m.BonchoHerbView), { ssr: false }),
  'dict-char':       dynamic(() => import('./inline/DictCharView').then(m => m.DictCharView), { ssr: false }),
  'edu-lesson':      dynamic(() => import('./inline/EduLessonView').then(m => m.EduLessonView), { ssr: false }),
  'edu-assignment':  dynamic(() => import('./inline/EduAssignmentView').then(m => m.EduAssignmentView), { ssr: false }),
  'task-check-simple': dynamic(() => import('./inline/TaskCheckView').then(m => m.TaskCheckView), { ssr: false }),
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
  shanghanlun: { previewOnClick: false },
  boncho:     { previewOnClick: false },
  scrap:      { previewOnClick: true },
  youtube:    { previewOnClick: false },
  map:        { previewOnClick: false },
  // inline views — no preview overlay
  'schedule-time':     { previewOnClick: false },
  'schedule-date':     { previewOnClick: false },
  'schedule-range':    { previewOnClick: false },
  'schedule-today':    { previewOnClick: false },
  'schedule-tomorrow': { previewOnClick: false },
  'schedule-week':     { previewOnClick: false },
  'schedule-around':   { previewOnClick: false },
  'finance-amount':    { previewOnClick: false },
  'finance-balance':   { previewOnClick: false },
  'finance-today':     { previewOnClick: false },
  'finance-week':      { previewOnClick: false },
  'finance-compare':   { previewOnClick: false },
  'finance-category':  { previewOnClick: false },
  'task-check':        { previewOnClick: false },
  'task-deadline':     { previewOnClick: false },
  'task-today':        { previewOnClick: false },
  'task-overdue':      { previewOnClick: false },
  'task-week':         { previewOnClick: false },
  'idea-card':         { previewOnClick: false },
  'relation-card':     { previewOnClick: false },
  'habit-log':         { previewOnClick: false },
  'habit-streak':      { previewOnClick: false },
  'knowledge-note':    { previewOnClick: false },
  'media-card':        { previewOnClick: false },
  'media-rating':      { previewOnClick: false },
  'dev-note':          { previewOnClick: false },
  'location-pin':      { previewOnClick: false },
  'youtube-card':      { previewOnClick: false },
  'youtube-timestamp': { previewOnClick: false },
  'health-log':        { previewOnClick: false },
  'health-symptom':    { previewOnClick: false },
  'health-med':        { previewOnClick: false },
  'boncho-herb':       { previewOnClick: false },
  'dict-char':         { previewOnClick: false },
  'edu-lesson':        { previewOnClick: false },
  'edu-assignment':    { previewOnClick: false },
};

/** 도메인 → 기본 뷰 매핑 */
export const DOMAIN_VIEW_MAP: Record<string, string> = {
  schedule:    'schedule-time',
  task:        'task-check',
  knowledge:   'knowledge-note',
  finance:     'finance-amount',
  habit:       'habit-log',
  idea:        'idea-card',
  relation:    'relation-card',
  media:       'media-card',
  education:   'edu-lesson',
  location:    'location-pin',
  development: 'dev-note',
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
  'schedule-time':     '시간 강조 일정',
  'schedule-date':     '날짜 강조 일정',
  'schedule-range':    '기간 일정',
  'schedule-today':    '오늘 일정',
  'schedule-tomorrow': '내일 일정',
  'schedule-week':     '주간 일정',
  'schedule-around':   '앞뒤 3일 일정',
  // 인라인 — 가계부
  'finance-amount':    '금액 강조 지출',
  'finance-balance':   '잔액/합계',
  'finance-today':     '오늘 지출',
  'finance-week':      '주간 지출',
  'finance-compare':   '전월 비교',
  'finance-category':  '카테고리별 지출',
  // 인라인 — 할 일
  'task-check':        '할 일 체크',
  'task-deadline':     '마감 강조 할 일',
  'task-today':        '오늘 할 일',
  'task-overdue':      '밀린 할 일',
  'task-week':         '주간 할 일',
  // 인라인 — 기타
  'idea-card':         '아이디어 카드',
  'relation-card':     '인물 카드',
  'habit-log':         '습관 기록',
  'habit-streak':      '연속 기록 스트릭',
  'knowledge-note':    '지식 노트',
  'media-card':        '미디어 카드',
  'media-rating':      '평점 카드',
  'dev-note':          '개발 메모',
  'location-pin':      '장소 핀',
  'youtube-card':      '유튜브 카드',
  'youtube-timestamp': '타임스탬프 메모',
  'health-log':        '건강 수치 기록',
  'health-symptom':    '증상 기록',
  'health-med':        '복약 기록',
  'boncho-herb':       '약재 카드',
  'dict-char':         '한자 카드',
  'edu-lesson':        '수업 기록',
  'edu-assignment':    '과제 마감',
};
