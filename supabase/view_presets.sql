-- ============================================================
-- view_presets: 시스템 레벨 뷰 프리셋 (관리자 관리)
-- 실행: Supabase SQL Editor에 붙여넣기
-- ============================================================

CREATE TABLE IF NOT EXISTS view_presets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 식별
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  icon          text,

  -- 분류
  domain        text NOT NULL,
  domains       text[] DEFAULT '{}',          -- 크로스 도메인 뷰용
  category      text NOT NULL DEFAULT 'inline', -- 'inline' | 'full' | 'cross'

  -- 뷰 연결
  view_type     text NOT NULL,                -- VIEW_REGISTRY 키

  -- LLM 선택 기준
  when_to_use   text NOT NULL,
  emphasis      text,                         -- 강조 필드 힌트

  -- 설정
  default_config jsonb DEFAULT '{}',
  is_default    boolean DEFAULT false,
  sort_order    integer DEFAULT 0,

  -- 메타
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_view_presets_domain   ON view_presets(domain);
CREATE INDEX IF NOT EXISTS idx_view_presets_category ON view_presets(category);
CREATE INDEX IF NOT EXISTS idx_view_presets_active   ON view_presets(is_active) WHERE is_active = true;

-- RLS: 누구나 읽기 가능, 관리자만 쓰기
ALTER TABLE view_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_presets_read_all" ON view_presets FOR SELECT USING (true);

-- ============================================================
-- 시드 데이터
-- ============================================================

INSERT INTO view_presets
  (key, name, description, icon, domain, category, view_type, when_to_use, emphasis, is_default, sort_order)
VALUES

-- ── schedule ──────────────────────────────────────────────
('schedule-time',     '시간 강조 일정',     '특정 시각이 있는 단건 일정',           '🕐', 'schedule', 'inline', 'schedule-time',     '특정 시각이 있는 단건 일정 등록',                   'time',     true,  1),
('schedule-date',     '날짜 강조 일정',     '날짜만 있는 단건 일정',                '📅', 'schedule', 'inline', 'schedule-date',     '날짜는 있지만 시각이 없는 단건 일정 등록',           'date',     false, 2),
('schedule-range',    '기간 일정',          '시작~끝 기간이 있는 일정',             '📆', 'schedule', 'inline', 'schedule-range',    '시작일과 종료일이 있는 기간 일정 등록',               'range',    false, 3),
('schedule-today',    '오늘 일정',          '오늘 하루 타임라인',                   '☀️', 'schedule', 'full',   'schedule-today',    '오늘 일정 조회',                                    null,       false, 4),
('schedule-tomorrow', '내일 일정',          '내일 하루 타임라인',                   '🌅', 'schedule', 'full',   'schedule-tomorrow', '내일 일정 조회',                                    null,       false, 5),
('schedule-week',     '주간 일정',          '7일 주간 그리드',                      '📋', 'schedule', 'full',   'schedule-week',     '이번 주 전체 일정 조회',                            null,       false, 6),
('schedule-around',   '앞뒤 3일 일정',      '오늘 기준 앞뒤 3일 (총 7일)',          '🗓️', 'schedule', 'full',   'schedule-around',   '오늘 기준으로 가까운 일정 조회',                    null,       false, 7),
('schedule-month',    '월간 캘린더',        '30일 월간 캘린더 그리드',              '🗓️', 'schedule', 'full',   'calendar',          '기간 일정이거나 한 달 전체 조회',                   null,       false, 8),
('schedule-timeline', '일정 타임라인',      '시간순 일정 리스트',                   '⏱️', 'schedule', 'full',   'timeline',          '앞으로의 일정을 시간순으로 나열',                   null,       false, 9),

-- ── finance ───────────────────────────────────────────────
('finance-amount',    '금액 강조 지출',     '단건 지출/수입 카드',                  '💳', 'finance',  'inline', 'finance-amount',    '단건 지출 또는 수입 기록',                          'amount',   true,  1),
('finance-balance',   '잔액/합계 카드',     '합산 결과 강조 카드',                  '💰', 'finance',  'inline', 'finance-balance',   '특정 기간의 합계나 잔액 조회',                      'balance',  false, 2),
('finance-today',     '오늘 지출',          '오늘 지출 리스트 + 합계',              '📊', 'finance',  'full',   'finance-today',     '오늘 지출 내역 및 합계 조회',                       null,       false, 3),
('finance-week',      '주간 지출 차트',     '주간 일별 막대 차트',                  '📈', 'finance',  'full',   'finance-week',      '이번 주 지출 추이',                                 null,       false, 4),
('finance-month',     '월간 지출 차트',     '월간 카테고리 파이 차트',              '🥧', 'finance',  'full',   'chart',             '이번 달 지출 분석',                                 null,       false, 5),
('finance-compare',   '전월 비교',          '지난달 vs 이번달 비교',                '↔️', 'finance',  'full',   'finance-compare',   '지난 달과 이번 달 지출 비교',                       null,       false, 6),
('finance-category',  '카테고리별 지출',    '카테고리별 지출 분류',                 '🏷️', 'finance',  'full',   'finance-category',  '특정 카테고리 지출 분석',                           null,       false, 7),
('finance-list',      '지출 내역 목록',     '전체 지출 내역 테이블',                '📑', 'finance',  'full',   'table',             '지출 내역 목록 조회',                               null,       false, 8),

-- ── task ──────────────────────────────────────────────────
('task-check',        '할 일 체크',         '단건 할 일 체크박스 카드',             '☐', 'task',     'inline', 'task-check',        '단건 할 일 등록',                                   'title',    true,  1),
('task-deadline',     '마감 강조 할 일',    '마감일 D-day 강조 카드',               '⏰', 'task',     'inline', 'task-deadline',     '마감일이 있는 할 일 등록',                          'deadline', false, 2),
('task-today',        '오늘 할 일',         '오늘 할 일 체크리스트',                '✅', 'task',     'full',   'task-today',        '오늘 해야 할 일 목록',                              null,       false, 3),
('task-overdue',      '밀린 할 일',         '마감 지난 할 일 목록',                 '🚨', 'task',     'full',   'task-overdue',      '마감이 지난 밀린 할 일',                            null,       false, 4),
('task-week',         '주간 할 일',         '이번 주 할 일 (요일별 그룹)',           '📅', 'task',     'full',   'task-week',         '이번 주 할 일 목록',                                null,       false, 5),
('task-list',         '투두 리스트',        '전체 할 일 체크리스트',                '📝', 'task',     'full',   'todo',              '전체 할 일 목록 조회',                              null,       false, 6),
('task-kanban',       '칸반 보드',          '상태별 태스크 관리',                   '🗂️', 'task',     'full',   'task',              '상태별 프로젝트 태스크 관리',                       null,       false, 7),

-- ── idea ──────────────────────────────────────────────────
('idea-card',         '아이디어 카드',      '단건 아이디어 카드',                   '💡', 'idea',     'inline', 'idea-card',         '단건 아이디어 등록',                                'title',    true,  1),
('idea-recent',       '최근 아이디어',      '최근 아이디어 타임라인',               '🕐', 'idea',     'full',   'idea-recent',       '최근 등록한 아이디어 조회',                         null,       false, 2),
('idea-domain',       '주제별 아이디어',    '주제/도메인별 그룹 분류',              '🗂️', 'idea',     'full',   'idea-domain',       '주제별로 분류된 아이디어 조회',                     null,       false, 3),
('idea-board',        '아이디어 보드',      '전체 아이디어 보드',                   '🎯', 'idea',     'full',   'idea',              '전체 아이디어 모아보기',                            null,       false, 4),

-- ── relation ──────────────────────────────────────────────
('relation-card',     '인물 카드',          '단건 인물 정보 카드',                  '👤', 'relation', 'inline', 'relation-card',     '단건 인물 정보 등록',                               'name',     true,  1),
('relation-birthday', '다가오는 생일',      '이번 달 생일 리스트',                  '🎂', 'relation', 'full',   'relation-birthday', '곧 생일인 사람 조회',                               null,       false, 2),
('relation-recent',   '최근 인물',          '최근 언급/연락한 사람들',              '🕐', 'relation', 'full',   'relation-recent',   '최근에 언급되거나 연락한 인물 조회',                null,       false, 3),
('relation-group',    '그룹별 인물',        '관계 그룹별 분류',                     '👥', 'relation', 'full',   'relation-group',    '그룹/관계별로 분류된 인물 조회',                    null,       false, 4),
('relation-profile',  '프로필 상세',        '인물 프로필 상세 카드',                '📋', 'relation', 'full',   'profile',           '특정 인물 상세 정보 조회',                          null,       false, 5),

-- ── habit ─────────────────────────────────────────────────
('habit-log',         '습관 기록',          '단건 습관/운동 기록 카드',             '🏃', 'habit',    'inline', 'habit-log',         '단건 습관 또는 운동 기록 등록',                     'activity', true,  1),
('habit-streak',      '연속 기록 스트릭',   '연속 달성 스트릭 표시',               '🔥', 'habit',    'full',   'habit-streak',      '특정 습관의 연속 달성 기록 조회',                   null,       false, 2),
('habit-today',       '오늘 루틴',          '오늘 습관 체크리스트',                 '☀️', 'habit',    'full',   'habit-today',       '오늘 해야 할 루틴/습관 목록',                       null,       false, 3),
('habit-week',        '주간 습관 매트릭스', '주간 습관 달성 매트릭스',              '📊', 'habit',    'full',   'habit-week',        '이번 주 습관별 달성 현황',                          null,       false, 4),
('habit-heatmap',     '습관 히트맵',        '월간 습관 패턴 히트맵',                '🗓️', 'habit',    'full',   'heatmap',           '장기간 습관 패턴 분석',                             null,       false, 5),
('habit-chart',       '수치 추이 차트',     '측정값 변화 추이 차트',                '📈', 'habit',    'full',   'chart',             '몸무게, 거리 등 수치 변화 추이',                    null,       false, 6),

-- ── knowledge ─────────────────────────────────────────────
('knowledge-note',    '지식 노트',          '단건 지식/메모 카드',                  '📄', 'knowledge','inline', 'knowledge-note',    '단건 지식, 학습 내용, 메모 등록',                   'title',    true,  1),
('knowledge-recent',  '최근 학습',          '최근 지식 타임라인',                   '🕐', 'knowledge','full',   'knowledge-recent',  '최근에 학습하거나 기록한 지식 조회',                null,       false, 2),
('knowledge-topic',   '주제별 지식',        '주제별 지식 분류',                     '🗂️', 'knowledge','full',   'knowledge-topic',   '주제별로 분류된 지식 조회',                         null,       false, 3),
('knowledge-flash',   '플래시카드',         '학습/암기용 플래시카드',               '🃏', 'knowledge','full',   'flashcard',         '암기나 복습을 위한 플래시카드',                     null,       false, 4),
('knowledge-table',   '지식 테이블',        '지식 목록 테이블',                     '📋', 'knowledge','full',   'table',             '전체 지식/학습 기록 목록',                          null,       false, 5),

-- ── media ─────────────────────────────────────────────────
('media-card',        '미디어 카드',        '단건 미디어 기록 카드',                '🎬', 'media',    'inline', 'media-card',        '단건 영화/책/음악 등 미디어 기록',                  'title',    true,  1),
('media-rating',      '평점 강조 카드',     '평점이 있는 미디어 카드',              '⭐', 'media',    'inline', 'media-rating',      '평점이 포함된 미디어 기록',                         'rating',   false, 2),
('media-watchlist',   '볼 것 목록',         '볼 것/읽을 것 위시리스트',             '📋', 'media',    'full',   'media-watchlist',   '앞으로 보거나 읽을 것 목록',                        null,       false, 3),
('media-recent',      '최근 미디어',        '최근 소비한 미디어 타임라인',          '🕐', 'media',    'full',   'media-recent',      '최근에 보거나 읽은 콘텐츠 조회',                    null,       false, 4),
('media-genre',       '장르별 미디어',      '장르/유형별 분류',                     '🗂️', 'media',    'full',   'media-genre',       '장르나 유형별로 분류된 미디어 조회',                null,       false, 5),
('media-scrap',       '미디어 스크랩',      '전체 미디어 스크랩 보드',              '📌', 'media',    'full',   'scrap',             '저장한 미디어 전체 모아보기',                       null,       false, 6),

-- ── development ───────────────────────────────────────────
('dev-note',          '개발 메모',          '단건 개발 메모/스니펫 카드',           '💻', 'development','inline','dev-note',         '단건 개발 메모, 코드 스니펫, 기술 노트 등록',       'title',    true,  1),
('dev-log',           '개발 일지',          '개발 작업 타임라인',                   '📖', 'development','full', 'dev-log',           '개발 작업 히스토리 타임라인',                       null,       false, 2),
('dev-stack',         '기술 스택',          '기술 스택 태그 클라우드',              '🛠️', 'development','full', 'dev-stack',         '사용 중인 기술 스택 정리',                          null,       false, 3),
('dev-snippet',       '코드 스니펫',        '저장된 코드 스니펫 목록',              '📋', 'development','full', 'dev-snippet',       '저장한 코드 스니펫 조회',                           null,       false, 4),
('dev-table',         '개발 기록 목록',     '개발 기록 테이블',                     '📑', 'development','full', 'table',             '전체 개발 기록 목록',                               null,       false, 5),

-- ── location ──────────────────────────────────────────────
('location-pin',      '장소 핀',            '단건 장소 카드',                       '📍', 'location', 'inline', 'location-pin',      '단건 장소, 맛집, 카페 등 등록',                     'name',     true,  1),
('location-map',      '장소 지도',          '저장한 장소 지도 뷰',                  '🗺️', 'location', 'full',   'map',               '저장한 장소들을 지도로 시각화',                     null,       false, 2),
('location-nearby',   '근처 장소',          '현재 위치 기준 근처 저장 장소',        '📡', 'location', 'full',   'location-nearby',   '현재 위치 근처에 저장한 장소 조회',                 null,       false, 3),
('location-category', '카테고리별 장소',    '카테고리별 장소 분류',                 '🏷️', 'location', 'full',   'location-category', '맛집, 카페 등 카테고리별 장소 조회',                null,       false, 4),
('location-recent',   '최근 장소',          '최근 저장/방문 장소',                  '🕐', 'location', 'full',   'location-recent',   '최근에 저장하거나 방문한 장소 조회',                null,       false, 5),

-- ── youtube ───────────────────────────────────────────────
('youtube-card',      '유튜브 카드',        '단건 유튜브 영상 카드',                '▶️', 'media',    'inline', 'youtube-card',      '단건 유튜브 영상 공유 또는 기록',                   'title',    false, 1),
('youtube-timestamp', '타임스탬프 메모',    '영상 특정 구간 메모 카드',             '⏱️', 'media',    'inline', 'youtube-timestamp', '유튜브 영상의 특정 시간대 메모',                    'timestamp',false, 2),
('youtube-playlist',  '유튜브 플레이리스트','저장한 영상 그리드',                   '📺', 'media',    'full',   'youtube',           '저장한 유튜브 영상 목록',                           null,       false, 3),
('youtube-notes',     '영상 + 노트',        '영상 썸네일과 노트 나란히',            '📓', 'media',    'full',   'youtube-notes',     '영상과 함께 정리한 노트/요약 보기',                 null,       false, 4),

-- ── education ─────────────────────────────────────────────
('edu-lesson',        '수업 기록',          '단건 수업/강의 기록 카드',             '📚', 'knowledge','inline', 'edu-lesson',        '수업, 강의, 세미나 내용 등록',                      'subject',  false, 1),
('edu-assignment',    '과제 마감',          '과제명 + D-day 강조 카드',             '📝', 'task',     'inline', 'edu-assignment',    '마감일이 있는 과제 등록',                           'deadline', false, 2),
('edu-curriculum',    '커리큘럼',           '과목별 학습 트리',                     '🌳', 'knowledge','full',   'curriculum',        '수업/강의 전체 커리큘럼 구조',                      null,       false, 3),
('edu-progress',      '학습 진도',          '진도율 프로그레스 바',                 '📊', 'knowledge','full',   'edu-progress',      '과목별 학습 진행도 확인',                           null,       false, 4),
('edu-timetable',     '시간표',             '주간 수업 시간표 그리드',              '📅', 'schedule', 'full',   'edu-timetable',     '학교/학원 시간표',                                  null,       false, 5),
('edu-lecture',       '강의 노트',          '강의 내용 정리 뷰',                    '🎓', 'knowledge','full',   'lecture',           '강의 노트 및 요약 내용',                            null,       false, 6),

-- ── health ────────────────────────────────────────────────
('health-log',        '건강 수치 기록',     '수치 강조 건강 기록 카드',             '💊', 'habit',    'inline', 'health-log',        '혈압, 체중, 혈당 등 건강 수치 기록',                'value',    false, 1),
('health-symptom',    '증상 기록',          '증상 키워드 강조 카드',                '🤒', 'habit',    'inline', 'health-symptom',    '두통, 발열 등 증상 기록',                           'symptom',  false, 2),
('health-med',        '복약 기록',          '약명 + 복용 시간 카드',               '💊', 'habit',    'inline', 'health-med',        '약 복용 기록',                                      'medicine', false, 3),
('health-trend',      '건강 추이 차트',     '건강 수치 변화 추이',                  '📈', 'habit',    'full',   'chart',             '혈압, 체중 등 수치 변화 추이',                      null,       false, 4),
('health-calendar',   '건강 달력',          '복약/증상 달력',                       '📅', 'habit',    'full',   'calendar',          '복약 이력이나 증상 달력',                           null,       false, 5),

-- ── boncho (본초학 — 관리자 도메인 예시) ─────────────────
('boncho-herb',       '약재 카드',          '단건 약재 정보 카드',                  '🌿', 'knowledge','inline', 'boncho-herb',       '약재 검색 또는 등록',                               'herb',     false, 1),
('boncho-detail',     '약재 상세',          '약재 효능/주치/용량 상세',             '📋', 'knowledge','full',   'boncho',            '약재 상세 정보 조회',                               null,       false, 2),
('boncho-compare',    '약재 비교',          '약재 비교 테이블',                     '↔️', 'knowledge','full',   'table',             '두 가지 이상 약재 비교',                            null,       false, 3),
('boncho-category',   '분류별 약재',        '분류별 약재 목록',                     '🗂️', 'knowledge','full',   'boncho',            '해표약, 이수약 등 분류별 약재',                     null,       false, 4),
('boncho-flash',      '본초 플래시카드',    '본초학 암기 카드',                     '🃏', 'knowledge','full',   'flashcard',         '본초 암기용 플래시카드',                            null,       false, 5),

-- ── dictionary (한자) ─────────────────────────────────────
('dict-char',         '한자 카드',          '한자 음훈 강조 카드',                  '字', 'knowledge','inline', 'dict-char',         '한자 검색 또는 뜻 확인',                            'char',     false, 1),
('dict-detail',       '한자 상세',          '획순/부수/용례 상세 뷰',               '📖', 'knowledge','full',   'dictionary',        '한자 상세 정보 (획순, 부수, 용례)',                 null,       false, 2),
('dict-list',         '한자 목록',          '검색한 한자 그리드',                   '📋', 'knowledge','full',   'dictionary',        '검색하거나 저장한 한자 목록',                       null,       false, 3),
('dict-flash',        '한자 플래시카드',    '한자 암기 카드',                       '🃏', 'knowledge','full',   'flashcard',         '한자 암기용 플래시카드',                            null,       false, 4),

-- ── 크로스 도메인 복합 뷰 ─────────────────────────────────
('cross-schedule-map',      '일정 + 지도',        '일정 타임라인 + 장소 지도',            '🗺️', 'schedule', 'cross', 'schedule-map',      '장소가 있는 일정 - 어디서 뭐 하는지',               null, false, 1),
('cross-schedule-relation', '일정 + 인물',        '일정과 참석자 함께',                   '👥', 'schedule', 'cross', 'schedule-relation', '누구와 있는 약속/모임 일정',                        null, false, 2),
('cross-finance-location',  '지출 + 장소',        '지출 내역 + 소비 장소 지도',           '💳', 'finance',  'cross', 'finance-location',  '어디서 얼마를 썼는지',                              null, false, 3),
('cross-youtube-knowledge', '영상 + 노트',        '유튜브 영상과 정리 노트 나란히',       '📓', 'media',    'cross', 'youtube-knowledge', '영상 보고 정리한 노트/요약',                        null, false, 4),
('cross-task-schedule',     '할 일 + 일정',       '마감 있는 태스크 + 캘린더',            '📅', 'task',     'cross', 'task-schedule',     '마감일이 있는 할 일과 일정 통합',                   null, false, 5),
('cross-habit-health',      '습관 + 건강',        '운동 기록 + 건강 수치 연동',           '💪', 'habit',    'cross', 'habit-health',      '운동하고 건강 수치 변화 확인',                      null, false, 6),
('cross-relation-schedule', '인물 + 만남 이력',   '인물 카드 + 만남/연락 타임라인',       '👤', 'relation', 'cross', 'relation-schedule', '특정 인물과의 만남 이력',                           null, false, 7),
('cross-media-knowledge',   '미디어 + 감상 노트', '책/영화 + 독서/감상 노트',             '📖', 'media',    'cross', 'media-knowledge',   '콘텐츠와 함께 정리한 감상/메모',                    null, false, 8),
('cross-edu-schedule',      '수업 + 과제 일정',   '시간표 + 과제 마감 통합',              '🎓', 'knowledge','cross', 'edu-schedule',      '이번 주 수업 일정과 과제 마감 함께',                null, false, 9),
('cross-finance-habit',     '지출 + 소비 습관',   '소비 패턴 + 습관 히트맵',              '📊', 'finance',  'cross', 'finance-habit',     '특정 소비(커피, 배달 등) 습관 분석',                null, false, 10)

ON CONFLICT (key) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  when_to_use   = EXCLUDED.when_to_use,
  updated_at    = now();
