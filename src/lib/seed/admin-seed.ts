import type { SupabaseClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

interface SeedNode {
  title: string;
  domain: string;
  raw: string;
  domain_data: Record<string, any>;
  category: string; // internal grouping for seed management
  /** true = 서비스 소개용 (public). false/undefined = 운영 데이터 (private, 격리) */
  isServiceIntro?: boolean;
}

/**
 * 운영 데이터용 domain_data 마커.
 * _admin_internal: true → 모든 공개 쿼리/검색에서 제외
 * _visibility_locked: true → 비공개 고정, 토글 불가
 */
export function makeAdminInternalDomainData(extra: Record<string, any> = {}): Record<string, any> {
  return { ...extra, _admin_internal: true, _visibility_locked: true };
}

const SEED_NODES: SeedNode[] = [
  // ── Knowledge domain: OU 소개 ── (서비스 소개 = public)
  {
    title: 'OU란?',
    domain: 'knowledge',
    category: 'intro',
    isServiceIntro: true,
    raw: 'OU는 대화로 데이터를 만들고, 원하는 형태로 꺼내 쓰는 개인 데이터 우주 플랫폼입니다. 말만 하면 자동으로 기록되고, 캘린더, 가계부, 학습 노트 등 어떤 형태로든 볼 수 있어요.',
    domain_data: {
      topic: 'OU 소개',
      tags: ['소개', '플랫폼'],
      order: 1,
    },
  },
  {
    title: 'Just talk.',
    domain: 'knowledge',
    category: 'intro',
    isServiceIntro: true,
    raw: 'OU의 핵심 철학. 복잡한 입력 없이, 그냥 말만 하면 됩니다. AI가 맥락을 이해하고 알아서 정리해줍니다.',
    domain_data: {
      topic: 'OU 철학',
      tags: ['철학', 'Just talk'],
      order: 2,
    },
  },
  {
    title: '내 우주',
    domain: 'knowledge',
    category: 'intro',
    isServiceIntro: true,
    raw: '모든 기록이 별이 되어 떠다니는 나만의 우주. 기록이 쌓일수록 우주가 풍성해지고, 별들 사이의 관계가 만들어집니다.',
    domain_data: {
      topic: 'OU 콘셉트',
      tags: ['우주', '그래프'],
      order: 3,
    },
  },

  // ── Product domain: 기능 ── (서비스 소개 = public)
  {
    title: 'AI 대화',
    domain: 'product',
    category: 'feature',
    isServiceIntro: true,
    raw: '친구처럼 편하게 대화하면 AI가 맥락을 이해하고 기록합니다. 일정, 가계부, 감정, 인물 관계 등 뭐든 기록돼요.',
    domain_data: {
      feature: 'AI 대화',
      tags: ['AI', '대화', '기록'],
      order: 1,
    },
  },
  {
    title: '자동 정리',
    domain: 'product',
    category: 'feature',
    isServiceIntro: true,
    raw: '말한 내용을 AI가 자동으로 분류합니다. 일정은 캘린더로, 지출은 가계부로, 공부한 건 학습 노트로.',
    domain_data: {
      feature: '자동 정리',
      tags: ['자동', '분류', 'AI'],
      order: 2,
    },
  },
  {
    title: '다양한 보기',
    domain: 'product',
    category: 'feature',
    isServiceIntro: true,
    raw: '같은 기록을 캘린더, 칸반보드, 차트, 마인드맵, 타임라인 등 원하는 형태로 볼 수 있어요.',
    domain_data: {
      feature: '다양한 보기',
      tags: ['뷰', '캘린더', '칸반', '차트'],
      order: 3,
    },
  },
  {
    title: '이미지 인식',
    domain: 'product',
    category: 'feature',
    isServiceIntro: true,
    raw: '시간표, 영수증, 문서 사진을 올리면 AI가 내용을 읽고 자동으로 기록합니다.',
    domain_data: {
      feature: '이미지 인식',
      tags: ['OCR', '이미지', '사진'],
      order: 4,
    },
  },
  {
    title: '공유하기',
    domain: 'product',
    category: 'feature',
    isServiceIntro: true,
    raw: '기록을 원하는 형태의 뷰로 만들어 다른 사람에게 공유할 수 있어요. 강의 노트, 여행 일정, 가계부 등.',
    domain_data: {
      feature: '공유하기',
      tags: ['공유', '뷰'],
      order: 5,
    },
  },
  {
    title: '그룹',
    domain: 'product',
    category: 'feature',
    isServiceIntro: true,
    raw: '친구, 동아리, 스터디 그룹과 함께 기록을 모으고 함께 볼 수 있어요.',
    domain_data: {
      feature: '그룹',
      tags: ['그룹', '협업'],
      order: 6,
    },
  },

  // ── Education domain: 활용법 ── (서비스 소개 = public)
  {
    title: '학생을 위한 OU',
    domain: 'education',
    category: 'usecase',
    isServiceIntro: true,
    raw: '강의 녹음을 올리면 자동으로 수업 노트가 만들어지고, 시험 대비 퀴즈도 자동 생성됩니다.',
    domain_data: {
      audience: '학생',
      tags: ['학생', '강의', '노트', '퀴즈'],
      order: 1,
    },
  },
  {
    title: '직장인을 위한 OU',
    domain: 'education',
    category: 'usecase',
    isServiceIntro: true,
    raw: '회의 내용을 말하면 자동으로 회의록이 되고, 할 일은 칸반보드로 정리됩니다.',
    domain_data: {
      audience: '직장인',
      tags: ['직장인', '회의록', '칸반'],
      order: 2,
    },
  },
  {
    title: '일상을 위한 OU',
    domain: 'education',
    category: 'usecase',
    isServiceIntro: true,
    raw: '오늘 뭐 먹었는지, 누구 만났는지, 얼마 썼는지. 그냥 말하면 다 기록됩니다.',
    domain_data: {
      audience: '일상',
      tags: ['일상', '기록', '라이프로그'],
      order: 3,
    },
  },

  // ── Knowledge domain: FAQ ── (서비스 소개 = public)
  {
    title: '무료인가요?',
    domain: 'knowledge',
    category: 'faq',
    isServiceIntro: true,
    raw: '기본 기능은 무료입니다. 하루 50회 대화가 가능하고, Pro로 업그레이드하면 무제한으로 사용할 수 있어요.',
    domain_data: {
      topic: 'FAQ',
      tags: ['FAQ', '요금', '무료'],
      order: 10,
    },
  },
  {
    title: '내 데이터는 안전한가요?',
    domain: 'knowledge',
    category: 'faq',
    isServiceIntro: true,
    raw: '모든 데이터는 암호화되어 저장되며, 본인만 볼 수 있어요. 공개 설정은 직접 선택합니다.',
    domain_data: {
      topic: 'FAQ',
      tags: ['FAQ', '보안', '프라이버시'],
      order: 11,
    },
  },
  {
    title: '어떤 기기에서 쓸 수 있나요?',
    domain: 'knowledge',
    category: 'faq',
    isServiceIntro: true,
    raw: '웹 브라우저가 있는 모든 기기에서 사용할 수 있어요. PC, 태블릿, 스마트폰 모두 가능합니다.',
    domain_data: {
      topic: 'FAQ',
      tags: ['FAQ', '기기', '호환'],
      order: 12,
    },
  },

  // ── Knowledge domain: 시나리오 ── (서비스 소개 = public)
  {
    title: '의대생 민수의 해부학 시험',
    domain: 'knowledge',
    category: 'scenario',
    isServiceIntro: true,
    raw: '민수는 새벽 2시에 중얼거렸다. "상완골은 견갑골이랑 관절 이루고..." OU는 조용히 그 말을 뼈와 관절의 관계 그래프로 만들었다. 시험 전날, 민수가 "해부학 전체 범위 퀴즈"를 요청하자, 자기가 한 말에서 자동 생성된 300문제가 나타났다. 틀린 문제만 모은 오답노트가 PDF로 내려왔다. 민수는 A+를 받았고, 그 퀴즈를 후배에게 공유했다. 구독료로 치킨을 사 먹었다.',
    domain_data: {
      category: 'scenario',
      tags: ['학생', '시험', '퀴즈', '공유'],
      order: 20,
    },
  },
  {
    title: '신혼부부의 오사카 여행',
    domain: 'knowledge',
    category: 'scenario',
    isServiceIntro: true,
    raw: '지연과 민호는 결혼 전부터 OU에 여행 계획을 말했다. "오사카 3박 4일, 예산 150만원, 맛집 위주로." OU는 일정뷰, 지도뷰, 예산뷰를 자동으로 만들었다. 여행 중 "오코노미야키 12,000원" 하고 말하면 가계부에 자동 기록. 돌아와서 "여행 정산해줘" 하자, 카테고리별 지출 차트와 사진 타임라인이 나타났다. 둘은 그 여행기를 부모님께 공유했다.',
    domain_data: {
      category: 'scenario',
      tags: ['여행', '가계부', '그룹', '공유'],
      order: 21,
    },
  },
  {
    title: '은퇴한 아버지의 첫 별',
    domain: 'knowledge',
    category: 'scenario',
    isServiceIntro: true,
    raw: '은퇴 후 할 일이 없던 아버지가 딸의 권유로 OU를 시작했다. "오늘 혈압 130에 85, 아침에 된장찌개 먹었어." 그게 전부였다. 한 달 뒤, 혈압 추이 그래프와 식단 패턴이 만들어져 있었다. 병원에서 의사에게 PDF로 보여주자, 의사가 놀랐다. "어르신, 이거 어떻게 만드셨어요?" 아버지의 우주에 첫 번째 별이 반짝였다.',
    domain_data: {
      category: 'scenario',
      tags: ['가족', '건강', '일상'],
      order: 22,
    },
  },
  {
    title: '새벽의 가사',
    domain: 'knowledge',
    category: 'scenario',
    isServiceIntro: true,
    raw: '새벽 3시, 수빈은 멜로디가 떠올라 OU에 흥얼거렸다. "외로운 밤, 별이 쏟아지는 이 거리..." 음성이 텍스트로 바뀌고, OU는 그것을 "가사" 카테고리에 넣었다. 다음 날 아침, "지난달에 쓴 가사 다 보여줘" 하자 12개의 가사 조각이 나타났다. 테마별로 묶어보니 앨범 한 장 분량이었다. 수빈은 그 중 세 곡을 골라 데모 작업을 시작했다.',
    domain_data: {
      category: 'scenario',
      tags: ['창작', '음성', '분류'],
      order: 23,
    },
  },
  {
    title: '워킹맘의 3중 일정',
    domain: 'knowledge',
    category: 'scenario',
    isServiceIntro: true,
    raw: '은주는 아침마다 전쟁이다. "오늘 서준이 소풍, 도시락 싸야 하고, 2시에 클라이언트 미팅, 6시에 서준이 태권도." OU는 세 가지 캘린더를 자동으로 관리했다. 아이 일정, 업무 일정, 개인 일정. "내일 동선 최적화해줘" 하자, 어린이집→회사→태권도→마트 순서와 예상 시간이 나타났다. 은주는 처음으로 점심에 커피 한 잔 여유가 생겼다.',
    domain_data: {
      category: 'scenario',
      tags: ['일정', '가족', '동선'],
      order: 24,
    },
  },
  {
    title: '자취생의 냉장고',
    domain: 'knowledge',
    category: 'scenario',
    isServiceIntro: true,
    raw: '현우는 냉장고 사진을 찍어 OU에 올렸다. "이걸로 뭐 해먹을 수 있어?" AI가 재료를 인식하고 3가지 레시피를 추천했다. "계란볶음밥 만들었어, 계란 2개 씀" 하자 재고가 자동 업데이트됐다. 월말에 "이번 달 식비 얼마 썼어?" 하자, 카테고리별 지출과 자취 요리 레시피 모음이 나타났다. 현우는 그 레시피 모음을 자취생 커뮤니티에 공유했다.',
    domain_data: {
      category: 'scenario',
      tags: ['식단', '가계부', '레시피'],
      order: 25,
    },
  },
];

export async function seedAdminData(supabaseAdmin: SupabaseClient) {
  // 1. Look up admin user by email
  const { data: adminUsers, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  // Fallback: try auth.users if profiles table doesn't have email
  let adminUserId: string | null = adminUsers?.[0]?.id ?? null;

  if (!adminUserId) {
    // Try via auth admin API (requires service_role key)
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const adminAuth = authData?.users?.find(u => u.email === ADMIN_EMAIL);
    adminUserId = adminAuth?.id ?? null;
  }

  if (!adminUserId) {
    throw new Error(`Admin user not found for email: ${ADMIN_EMAIL}`);
  }

  // 2. Check which nodes already exist (by title match for this user)
  const { data: existingNodes } = await supabaseAdmin
    .from('data_nodes')
    .select('title')
    .eq('user_id', adminUserId)
    .eq('source_type', 'manual')
    .in('title', SEED_NODES.map(n => n.title));

  const existingTitles = new Set(
    (existingNodes ?? []).map((n: { title: string }) => n.title)
  );

  // 3. Filter to only new nodes
  const newNodes = SEED_NODES.filter(n => !existingTitles.has(n.title));

  if (newNodes.length === 0) {
    return { created: 0, skipped: SEED_NODES.length, adminUserId };
  }

  // 4. Insert new nodes
  // 서비스 소개 노드 = public, _admin_internal 없음
  // 운영 데이터 노드 = private, _admin_internal: true, _visibility_locked: true
  const insertPayload = newNodes.map(node => ({
    user_id: adminUserId,
    title: node.title,
    domain: node.domain,
    raw: node.raw,
    domain_data: node.isServiceIntro
      ? node.domain_data
      : makeAdminInternalDomainData(node.domain_data),
    visibility: node.isServiceIntro ? ('public' as const) : ('private' as const),
    confidence: 1.0,
    source_type: 'manual',
    resolution: 'resolved',
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('data_nodes')
    .insert(insertPayload)
    .select('id, title');

  if (insertError) {
    throw new Error(`Failed to insert seed data: ${insertError.message}`);
  }

  return {
    created: inserted?.length ?? 0,
    skipped: existingTitles.size,
    adminUserId,
    nodes: inserted,
  };
}
