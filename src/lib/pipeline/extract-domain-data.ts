/**
 * extract-domain-data.ts
 *
 * raw 텍스트에서 도메인별 구조화 필드를 추출한다.
 * LLM 호출 없이 정규식 + 패턴 매칭으로 경량 처리 (비용 0).
 */

import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

const today = () => dayjs().format('YYYY-MM-DD');

// ── schedule ──

const WEEKDAY_MAP: Record<string, number> = {
  월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4,
  금요일: 5, 토요일: 6, 일요일: 0,
};

const EVENT_KEYWORDS = [
  '결혼식', '미팅', '회의', '시험', '면접', '약속', '생일', '돌잔치',
  '발인', '여행', '예약', '수업', '강의', '세미나', '발표', '공연',
  '콘서트', '진료', '상담', '점검', '출장', '실습', '모임', '회식',
  '워크샵', '면담', '체육대회', '소풍',
];

const LOCATION_SUFFIXES = [
  '역', '카페', '병원', '학교', '대학', '회사', '센터', '공원',
  '마트', '백화점', '호텔', '식당', '빌딩', '타워', '광장',
  '시장', '터미널', '공항', '항구',
];

const DURATION_MAP: Record<string, number> = {
  '일주일': 7, '이틀': 2, '사흘': 3, '나흘': 4, '닷새': 5, '엿새': 6,
};

function extractSchedule(raw: string): Record<string, any> {
  const result: Record<string, any> = {};

  // 날짜: N월 N일
  const mdMatch = raw.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (mdMatch) {
    const m = parseInt(mdMatch[1], 10);
    const d = parseInt(mdMatch[2], 10);
    let date = dayjs().month(m - 1).date(d);
    if (date.isBefore(dayjs(), 'day')) date = date.add(1, 'year');
    result.date = date.format('YYYY-MM-DD');
  }

  // 날짜: 내일/모레/글피
  if (/내일/.test(raw)) result.date = dayjs().add(1, 'day').format('YYYY-MM-DD');
  if (/모레/.test(raw)) result.date = dayjs().add(2, 'day').format('YYYY-MM-DD');
  if (/글피/.test(raw)) result.date = dayjs().add(3, 'day').format('YYYY-MM-DD');

  // 날짜: 다음주/이번주 X요일
  const weekdayMatch = raw.match(/(다음주|이번주|이번|다음)\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/);
  if (weekdayMatch) {
    const isNext = weekdayMatch[1].includes('다음');
    const targetDay = WEEKDAY_MAP[weekdayMatch[2]];
    let date = dayjs().day(targetDay);
    if (isNext || date.isBefore(dayjs(), 'day')) date = date.add(7, 'day');
    result.date = date.format('YYYY-MM-DD');
  }

  // 날짜: 다음주/이번주 단독 (요일 없이) → 월요일 기본 + 모호 플래그
  if (!weekdayMatch) {
    const bareWeekMatch = raw.match(/(다음주|이번주)(?:부터|에)?/);
    if (bareWeekMatch) {
      const isNext = bareWeekMatch[1] === '다음주';
      let monday = dayjs().day(1); // 이번주 월요일
      if (isNext || monday.isBefore(dayjs(), 'day')) {
        monday = monday.add(7, 'day');
      }
      result.date = monday.format('YYYY-MM-DD');
      result._dateAmbiguous = true;
      result._dateHint = bareWeekMatch[1];
    }
  }

  // 기간 추출: 일주일간, 이틀간, 3일간, 2주간 → endDate 계산
  const durationMatch = raw.match(/(일주일|이틀|사흘|나흘|닷새|엿새|(\d+)\s*일|(\d+)\s*주(?:일)?)\s*(간|동안)/);
  if (durationMatch && result.date) {
    let days = 0;
    const durWord = durationMatch[1];
    if (DURATION_MAP[durWord]) {
      days = DURATION_MAP[durWord];
    } else if (durationMatch[2]) {
      days = parseInt(durationMatch[2], 10);
    } else if (durationMatch[3]) {
      days = parseInt(durationMatch[3], 10) * 7;
    }
    if (days > 0) {
      result.endDate = dayjs(result.date).add(days - 1, 'day').format('YYYY-MM-DD');
    }
  }

  // 날짜 기본값: 아무 패턴도 매칭 안 되면 오늘
  if (!result.date) result.date = today();

  // 시간: N시, 오전/오후 N시
  const timeMatch = raw.match(/(오전|오후)?\s*(\d{1,2})시\s*(\d{1,2})?분?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[2], 10);
    const min = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    if (timeMatch[1] === '오후' && hour < 12) hour += 12;
    else if (timeMatch[1] === '오전' && hour === 12) hour = 0;
    else if (!timeMatch[1] && hour < 12) {
      const currentHour = dayjs().hour();
      if (currentHour > hour) hour += 12; // 이미 지난 시간 → 오후로
      else if (hour >= 1 && hour <= 6) hour += 12; // 1~6시 → 오후 기본
    }
    result.time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // 장소: ~에서 앞 명사, 또는 장소 접미사 포함 단어
  const locAtMatch = raw.match(/([\uAC00-\uD7A3a-zA-Z0-9]+(?:역|카페|병원|학교|회사|센터|공원|마트|호텔|식당|빌딩|타워|광장|터미널|공항))/);
  if (locAtMatch) {
    result.location = locAtMatch[1];
  } else {
    const locFromMatch = raw.match(/([\uAC00-\uD7A3a-zA-Z0-9]{2,10})에서/);
    if (locFromMatch) result.location = locFromMatch[1];
  }

  // 제목: 키워드 앞 수식어(1단어)도 포함
  const TITLE_SKIP = new Set([
    '오전', '오후', '아침', '점심', '저녁', '밤', '새벽',
    '내일', '모레', '오늘', '다음주', '이번주', '어제',
    '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
    '나', '저', '우리',
  ]);
  for (const kw of EVENT_KEYWORDS) {
    const kwIdx = raw.indexOf(kw);
    if (kwIdx !== -1) {
      const tokens = raw.slice(0, kwIdx).trim().split(/\s+/).filter(Boolean);
      let modifier = '';
      if (tokens.length > 0) {
        // 마지막 토큰에서 단순 조사 제거 (과/와 제외 — 단어의 일부일 수 있음)
        const last = tokens[tokens.length - 1]
          .replace(/(이|가|을|를|은|는|로|으로|에서|에|의|도|만|한테|에게)$/, '');
        // 한글로 시작하는 의미있는 단어만 수식어로 인정
        if (last && /^[\uAC00-\uD7A3]/.test(last) && !TITLE_SKIP.has(last)) {
          modifier = last;
        }
      }
      result.title = modifier ? `${modifier} ${kw}` : kw;
      break;
    }
  }
  if (!result.title) {
    // 날짜/시간 표현과 조사를 제거하여 핵심 내용만 추출
    let cleaned = raw
      .replace(/(오전|오후)?\s*\d{1,2}시\s*(\d{1,2}분)?/g, '')
      .replace(/\d{1,2}월\s*\d{1,2}일/g, '')
      .replace(/(내일|모레|글피|오늘|다음주|이번주)\s*/g, '')
      .replace(/(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/g, '')
      .replace(/(일주일|이틀|사흘|나흘|닷새|엿새|\d+일|\d+주일?)\s*(간|동안)/g, '')
      .replace(/부터/g, '')
      .replace(/(에서|에|이|가|을|를|은|는|와|과|로|으로|하고|있어|있음|할거|해야|하기)/g, '')
      .replace(/(만남|만나기|만나|가기|가야|다녀|들르|방문)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    result.title = cleaned || raw.slice(0, 20);
  }

  return result;
}

// ── finance ──

const CATEGORY_MAP: Record<string, string> = {
  밥: '식비', 점심: '식비', 저녁: '식비', 아침: '식비', 식사: '식비',
  커피: '식비', 카페: '식비', 음료: '식비', 간식: '식비', 배달: '식비',
  택시: '교통', 버스: '교통', 지하철: '교통', 기차: '교통', 주유: '교통', 주차: '교통',
  옷: '쇼핑', 신발: '쇼핑', 가방: '쇼핑', 쇼핑: '쇼핑',
  병원: '의료', 약: '의료', 진료: '의료', 치료: '의료',
  월세: '주거', 관리비: '주거', 전기: '주거', 가스: '주거', 수도: '주거',
  통신: '통신', 핸드폰: '통신', 인터넷: '통신',
  책: '교육', 학원: '교육', 강의: '교육', 수업: '교육',
  영화: '여가', 공연: '여가', 게임: '여가', 운동: '여가', 헬스: '여가',
};

function extractFinance(raw: string): Record<string, any> {
  const result: Record<string, any> = { date: today() };

  // 금액 파싱 — 다건 추출
  const amountRegex = /(\d[\d,]*)(?:\s*)(만원|천원|원)/g;
  const items: Array<{ amount: number; label: string; category: string }> = [];

  // 쉼표나 줄바꿈으로 분리된 항목별 처리
  const segments = raw.split(/[,，]\s*|\n+/).map(s => s.trim()).filter(Boolean);

  for (const segment of segments) {
    const match = segment.match(/(\d[\d,]*)(?:\s*)(만원|천원|원)/);
    if (!match) continue;

    let amount = parseInt(match[1].replace(/,/g, ''), 10);
    if (match[2] === '만원') amount *= 10000;
    if (match[2] === '천원') amount *= 1000;

    // 이 세그먼트의 카테고리
    let category = '기타';
    for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
      if (segment.includes(keyword)) { category = cat; break; }
    }

    // 라벨: 금액 제거한 나머지
    const label = segment.replace(/\d[\d,]*\s*(만원|천원|원)/g, '').trim() || category;

    items.push({ amount, label, category });
  }

  if (items.length > 0) {
    result.items = items;
    result.amount = items.reduce((sum, it) => sum + it.amount, 0);
    result.category = items[0].category;
  } else {
    // 단건 fallback
    const singleMatch = raw.match(/(\d[\d,]*)(?:\s*)(만원|천원|원)/);
    if (singleMatch) {
      let amount = parseInt(singleMatch[1].replace(/,/g, ''), 10);
      if (singleMatch[2] === '만원') amount *= 10000;
      if (singleMatch[2] === '천원') amount *= 1000;
      result.amount = amount;
    }
    for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
      if (raw.includes(keyword)) { result.category = category; break; }
    }
    if (!result.category) result.category = '기타';
  }

  // 제목
  const title = raw
    .replace(/\d[\d,]*\s*(만원|천원|원)/g, '')
    .replace(/결제|지출|소비|지불|구매|입금|송금/g, '')
    .trim();
  result.title = title.slice(0, 20) || result.category;

  return result;
}

// ── emotion ──

const MOOD_MAP: Record<string, string> = {
  슬프: '슬픔', 슬퍼: '슬픔', 슬픔: '슬픔',
  기쁘: '기쁨', 기뻐: '기쁨', 행복: '기쁨', 좋아: '기쁨', 좋았: '기쁨',
  화나: '분노', 짜증: '분노', 열받: '분노',
  힘들: '힘듦', 지치: '힘듦', 피곤: '힘듦',
  걱정: '불안', 불안: '불안', 두려: '불안',
  외로: '외로움', 허전: '외로움',
  감사: '감사', 고마: '감사',
  우울: '우울', 무기력: '우울',
};

function extractEmotion(raw: string): Record<string, any> {
  const result: Record<string, any> = {
    date: today(),
    content: raw,
  };

  for (const [keyword, mood] of Object.entries(MOOD_MAP)) {
    if (raw.includes(keyword)) {
      result.mood = mood;
      break;
    }
  }

  return result;
}

// ── relation ──

const RELATION_KEYWORDS: Record<string, string> = {
  엄마: '가족', 아빠: '가족', 부모: '가족', 형: '가족', 누나: '가족',
  오빠: '가족', 언니: '가족', 동생: '가족', 남편: '가족', 아내: '가족',
  할머니: '가족', 할아버지: '가족', 아들: '가족', 딸: '가족',
  친구: '친구', 절친: '친구', 베프: '친구',
  선배: '직장', 후배: '직장', 동료: '직장', 팀장: '직장', 대표: '직장',
  사수: '직장', 부장: '직장', 과장: '직장', 차장: '직장', 사장: '직장',
  교수: '학교', 선생: '학교', 교사: '학교', 동기: '학교',
};

function extractRelation(raw: string): Record<string, any> {
  const result: Record<string, any> = { date: today() };

  // 이름 추출: ~이, ~씨, ~님 앞 한글 2-4자
  const nameMatch = raw.match(/([\uAC00-\uD7A3]{2,4})(이|씨|님|한테|에게|이랑|이가|이는|이의)/);
  if (nameMatch) {
    result.name = nameMatch[1];
  }

  // 연락처
  const phoneMatch = raw.match(/01[016789]-?\d{3,4}-?\d{4}/);
  if (phoneMatch) {
    result.contact = phoneMatch[0];
  }

  // 이메일
  const emailMatch = raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) {
    result.contact = result.contact ? `${result.contact}, ${emailMatch[0]}` : emailMatch[0];
  }

  // 관계 유형
  for (const [keyword, type] of Object.entries(RELATION_KEYWORDS)) {
    if (raw.includes(keyword)) {
      result.relationship = keyword;
      result.type = type;
      break;
    }
  }
  if (!result.type) result.type = '기타';

  // 메모
  result.memo = raw;

  return result;
}

// ── habit ──

const HABIT_KEYWORDS = [
  '운동', '러닝', '달리기', '조깅', '걷기', '산책', '수영', '헬스', '웨이트',
  '요가', '필라테스', '스트레칭', '자전거', '등산',
  '독서', '책', '공부', '학습', '영어', '코딩',
  '명상', '일기', '감사', '물 마시기', '영양제',
  '금연', '금주', '절주', '다이어트', '식단',
];

function extractHabit(raw: string): Record<string, any> {
  const result: Record<string, any> = {
    date: today(),
    completed: /완료|했다|했어|끝|성공|달성/.test(raw),
  };

  // 활동명
  for (const habit of HABIT_KEYWORDS) {
    if (raw.includes(habit)) {
      result.title = habit;
      break;
    }
  }
  if (!result.title) result.title = raw.slice(0, 15);

  // 시간/거리
  const durationMatch = raw.match(/(\d+)\s*(분|시간|km|킬로)/);
  if (durationMatch) {
    result.duration = `${durationMatch[1]}${durationMatch[2]}`;
  }

  // 횟수
  const countMatch = raw.match(/(\d+)\s*(회|번|세트|개)/);
  if (countMatch) {
    result.count = `${countMatch[1]}${countMatch[2]}`;
  }

  return result;
}

// ── development ──

const DEV_ACTION_PATTERNS: Array<{ pattern: RegExp; action: string }> = [
  { pattern: /플랜|계획|설계|기획|구조/, action: 'plan' },
  { pattern: /에러|오류|버그|실패|문제/, action: 'debug' },
  { pattern: /리팩토링|정리|개선|최적화/, action: 'refactor' },
  { pattern: /구현|만들|생성|추가|작성/, action: 'implement' },
  { pattern: /배포|deploy|빌드|build/, action: 'deploy' },
  { pattern: /테스트|검증|확인/, action: 'test' },
];

const TECH_KEYWORDS = [
  'next.js', 'react', 'typescript', 'supabase', 'vercel', 'mantine',
  'prisma', 'postgresql', 'redis', 'cloudflare', 'r2', 'pixijs',
  'd3', 'zustand', 'tailwind', 'node', 'api', 'webhook', 'ssr',
  'ssg', 'rls', 'jwt', 'oauth', 'claude', 'openai', 'llm',
];

function extractDevelopment(raw: string): Record<string, any> {
  const result: Record<string, any> = { date: today() };
  const lowerRaw = raw.toLowerCase();

  // 파일명 추출: xxx.ts, xxx.tsx, xxx.js 등
  const fileMatches = raw.match(/[\w\-/]+\.(ts|tsx|js|jsx|css|md|json|sql)/g);
  if (fileMatches) {
    result.files_changed = Array.from(new Set(fileMatches)).slice(0, 10);
  }

  // 에러 타입 추출
  const errorMatch = raw.match(/(TypeError|SyntaxError|ReferenceError|Error|에러|오류)[:：\s]*(.*?)(?:\n|$)/);
  if (errorMatch) {
    result.error_type = errorMatch[1];
    result.error_message = errorMatch[2]?.trim().slice(0, 100);
  }

  // 기술 스택 추출
  const techStack = TECH_KEYWORDS.filter(kw => lowerRaw.includes(kw));
  if (techStack.length > 0) {
    result.tech_stack = techStack;
  }

  // 액션 타입 추출
  for (const { pattern, action } of DEV_ACTION_PATTERNS) {
    if (pattern.test(raw)) {
      result.action_type = action;
      break;
    }
  }
  if (!result.action_type) result.action_type = 'general';

  // 제목: 첫 문장 또는 첫 30자
  const firstLine = raw.split('\n')[0].trim();
  result.title = firstLine.slice(0, 50) || '개발 세션';

  return result;
}

// ── note ──

function extractNote(raw: string): Record<string, any> {
  // 제목: 첫 줄 (최대 60자)
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const title = (lines[0] ?? raw.slice(0, 30))
    .replace(/^(노트|메모|기록|글)\s*(:|：|—)?\s*/i, '')
    .slice(0, 60);

  // Tiptap JSON blocks 생성 — 각 문단을 paragraph 노드로
  const bodyLines = lines.slice(1).length > 0 ? lines.slice(1) : lines;
  const blocks = {
    type: 'doc',
    content: bodyLines.map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };

  return {
    title,
    blocks,
    content: raw,
    date: today(),
  };
}

// ── 기본 (knowledge, idea 등) ──

function extractDefault(raw: string): Record<string, any> {
  return {
    title: raw.replace(/\s+/g, ' ').trim().slice(0, 30),
    content: raw,
    date: today(),
  };
}

// ── 메인 함수 ──

const EXTRACTORS: Record<string, (raw: string) => Record<string, any>> = {
  schedule: extractSchedule,
  finance: extractFinance,
  emotion: extractEmotion,
  relation: extractRelation,
  habit: extractHabit,
  development: extractDevelopment,
  note: extractNote,
};

export function extractDomainData(raw: string, domain: string): Record<string, any> {
  const extractor = EXTRACTORS[domain];
  return extractor ? extractor(raw) : extractDefault(raw);
}
