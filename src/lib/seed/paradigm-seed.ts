import type { SupabaseClient } from '@supabase/supabase-js';
import { makeAdminInternalDomainData } from './admin-seed';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

interface ParadigmNode {
  title: string;
  raw: string;
  domain_data: {
    category: 'paradigm_shift';
    title: string;
    summary: string;
    tags: string[];
    use_cases: string[];
    order: number;
  };
}

const PARADIGM_NODES: ParadigmNode[] = [
  {
    title: 'OU는 OS/파일시스템을 대체한다',
    raw: '지금 사람들은 폴더에 파일을 넣고, 앱으로 열어서 본다. 1980년대에 만들어진 방식이다. 파일 확장자가 앱을 결정하고, 폴더 구조가 정리 방식을 결정한다. OU에서는 데이터가 들어오면 형태가 없다. 뷰가 형태를 만들어준다. 같은 데이터를 문서로도, 표로도, 그래프로도, 발표자료로도 볼 수 있다. "어디에 저장했지?"라는 질문 자체가 사라진다. 폴더 계층 대신 그래프 관계로 정리되니까 더 유연하다.',
    domain_data: {
      category: 'paradigm_shift',
      title: 'OS/파일시스템 대체',
      summary: '폴더와 파일 확장자의 시대가 끝난다. 데이터는 형태 없이 존재하고, 뷰가 형태를 만든다.',
      tags: ['OS', '파일시스템', '폴더', '패러다임전환'],
      use_cases: ['홍보물', 'SNS', '투자IR', '비전발표'],
      order: 1,
    },
  },
  {
    title: 'OU는 검색엔진을 대체한다',
    raw: 'Google은 남의 데이터에서 키워드로 찾는 도구다. 검색 결과는 남이 만든 페이지 링크 목록이고, 내 맥락과는 무관하다. OU에서는 내 데이터 안에서 관계로 찾는다. "이거랑 연결된 거 뭐 있어?"라고 물으면 그래프를 탐색하고, "비슷한 거 뭐 있어?"라고 물으면 벡터 유사도로 찾아준다. 검색이 아니라 탐색이다. 발견이다. 검색 결과 자체가 리스트, 그래프, 맵 등 어떤 형태의 뷰로든 나올 수 있다.',
    domain_data: {
      category: 'paradigm_shift',
      title: '검색엔진 대체',
      summary: '키워드 검색의 시대가 끝난다. 내 데이터 안에서 관계와 유사도로 탐색하고 발견한다.',
      tags: ['검색', 'Google', '시맨틱검색', '그래프탐색'],
      use_cases: ['홍보물', 'SNS', '투자IR', '기술블로그'],
      order: 2,
    },
  },
  {
    title: 'OU는 개인의 기억을 외부화한다',
    raw: '기억은 뇌에 의존한다. 카톡, 메모, 사진첩, 캘린더에 흩어져 있다. "작년에 그거 뭐였지?" 하면 여러 앱을 뒤져야 하고, 찾아도 맥락이 없다. OU에서는 대화, 메모, 사진, 강의, 문서 등 모든 정보가 DataNode로 들어간다. 시간축으로 보면 타임라인, 주제별로 보면 그래프, 감정별로 보면 저널. "작년 봄에 뭐했지?" 하고 말하면 즉시 뷰로 나온다. 모든 입력이 자동으로 기억이 되고, 기억이 연결되고, 연결이 지식이 된다.',
    domain_data: {
      category: 'paradigm_shift',
      title: '개인 기억의 외부화',
      summary: '흩어진 기억이 하나의 우주에 모인다. 말하면 기억이 되고, 기억이 연결되어 지식이 된다.',
      tags: ['기억', '라이프로그', '타임라인', '세컨드브레인'],
      use_cases: ['홍보물', 'SNS', '소설', '감성마케팅'],
      order: 3,
    },
  },
  {
    title: 'OU는 조직의 암묵지를 구조화한다',
    raw: '회사에서 가장 비싼 것은 퇴사자의 머릿속 노하우다. Slack이나 Notion에 기록이 있어도 구조화가 안 되어 있어서 못 찾는다. 신입이 1년 걸려 파악하는 것이 바로 암묵지다. OU에서는 업무 대화가 자동으로 DataNode가 된다. 트리플로 관계가 구조화되고, 그래프로 시각화된다. 사람이 떠나도 지식 그래프는 남는다. 신입이 "이 프로젝트 맥락 알려줘" 하면 챗봇뷰가 즉시 답한다. 조직의 지식이 사람에게서 시스템으로 옮겨간다.',
    domain_data: {
      category: 'paradigm_shift',
      title: '조직 암묵지의 구조화',
      summary: '퇴사자와 함께 사라지던 노하우가 지식 그래프로 남는다. 조직의 기억은 사람이 아니라 시스템에.',
      tags: ['B2B', '암묵지', '지식관리', '온보딩'],
      use_cases: ['B2B마케팅', '투자IR', '기업제안서'],
      order: 4,
    },
  },
  {
    title: 'OU는 교육 시스템을 재정의한다',
    raw: '교과서는 고정된 뷰다. 모든 학생에게 같은 순서, 같은 깊이로 보여준다. 시험은 고정된 문제이고, 강의는 일방향이다. OU에서는 같은 지식 그래프를 학생마다 다른 뷰로 본다. 이미 아는 부분은 축소되고, 약한 부분은 자동으로 확장된다. 오답이 DataNode가 되어 취약 영역을 분석하고, 맞춤 문제가 자동 생성된다. 교과서가 사라지는 것이 아니라, 모든 학생이 자기만의 교과서를 갖게 되는 것이다.',
    domain_data: {
      category: 'paradigm_shift',
      title: '교육 시스템 재정의',
      summary: '고정된 교과서 대신 학생마다 다른 지식 뷰. 적응형 학습이 기본이 되는 세상.',
      tags: ['교육', '적응형학습', '에드테크', '퀴즈'],
      use_cases: ['교육시장마케팅', 'SNS', '투자IR', '교수제안'],
      order: 5,
    },
  },
  {
    title: 'OU는 미디어와 저널리즘을 재정의한다',
    raw: '기사는 기자가 만든 고정된 뷰다. 하나의 관점에서 쓰여지고, 시간순 피드로 흘러간다. 같은 사건의 전체 그림을 보려면 여러 기사를 직접 조합해야 한다. OU에서는 팩트가 DataNode다. 기사는 그 DataNode의 하나의 뷰일 뿐이다. 같은 사건을 경제 관점, 기술 관점, 사회 관점으로 각각 다른 뷰로 볼 수 있다. 시간축으로 보면 타임라인, 관련 사건끼리 보면 그래프. 독자가 자기 관점의 뷰를 직접 만들 수도 있다.',
    domain_data: {
      category: 'paradigm_shift',
      title: '미디어/저널리즘 재정의',
      summary: '기사는 팩트의 하나의 뷰일 뿐. 같은 사건을 여러 관점의 뷰로 본다.',
      tags: ['미디어', '저널리즘', '뉴스', '관점'],
      use_cases: ['미디어마케팅', 'SNS', '소설', '기술블로그'],
      order: 6,
    },
  },
  {
    title: 'OU는 스프레드시트를 대체한다',
    raw: 'Excel은 세상에서 가장 많이 쓰이는 데이터 도구다. 하지만 데이터가 행과 열에 갇혀 있다. 시각화하려면 차트를 따로 만들어야 하고, 공유하려면 파일을 전송해야 한다. 피벗 테이블은 같은 데이터를 다른 뷰로 보는 원시적 형태에 불과하다. OU에서는 테이블이 수많은 DataView 중 하나일 뿐이다. 같은 데이터를 테이블로도, 차트로도, 리포트로도, 대시보드로도 본다. 공유는 뷰 링크 하나면 끝이고, 항상 실시간으로 반영된다.',
    domain_data: {
      category: 'paradigm_shift',
      title: '스프레드시트 대체',
      summary: '행과 열에 갇힌 데이터를 해방한다. 테이블은 무한한 뷰 중 하나일 뿐.',
      tags: ['스프레드시트', 'Excel', '데이터도구', '테이블'],
      use_cases: ['홍보물', 'B2B마케팅', 'SNS', '투자IR'],
      order: 7,
    },
  },
  {
    title: 'OU는 클라우드와 협업 도구를 대체한다',
    raw: 'Dropbox와 Google Drive는 파일을 폴더에 넣고 꺼내는 구조다. Notion은 문서 기반, Slack은 대화 기반. 도구마다 데이터가 갇혀 있다. OU에서는 파일이든 텍스트든 대화든 전부 DataNode로 들어간다. 폴더 계층 대신 그래프 관계로 정리된다. 같은 데이터를 누구는 칸반으로, 누구는 타임라인으로, 누구는 채팅으로 본다. 대화 자체가 데이터가 되니까 사라지지 않는다. 도구가 분리되어 있지 않으니 데이터 사일로도 없다.',
    domain_data: {
      category: 'paradigm_shift',
      title: '클라우드/협업 도구 대체',
      summary: '도구마다 갇힌 데이터를 하나로 통합한다. 같은 데이터, 다른 뷰, 실시간 협업.',
      tags: ['클라우드', 'Dropbox', 'Notion', 'Slack', '협업'],
      use_cases: ['B2B마케팅', '투자IR', '기업제안서', 'SNS'],
      order: 8,
    },
  },
  {
    title: 'SNS 자동화 도구가 불필요해진다',
    raw: '지금은 인스타, 스레드, 유튜브용 콘텐츠를 각각 따로 만든다. Hootsuite나 Buffer 같은 자동화 툴로 각 채널에 배포하고, 채널마다 포맷이 달라서 같은 내용을 여러 번 가공한다. OU에서는 데이터를 한번 넣으면 SNS 뷰가 각 채널 포맷으로 뽑아준다. 인스타는 이미지 그리드 뷰, 스레드는 텍스트 피드 뷰, 유튜브는 영상과 자막 뷰. 자동화 툴이 필요 없다. DataView 자체가 배포 채널이 된다.',
    domain_data: {
      category: 'paradigm_shift',
      title: 'SNS 자동화 불필요',
      summary: '채널별 콘텐츠 가공이 사라진다. 데이터 하나, 뷰가 각 채널 포맷으로 배포한다.',
      tags: ['SNS', '인스타그램', '유튜브', '자동화', '마케팅'],
      use_cases: ['SNS마케팅', '홍보물', '크리에이터마케팅'],
      order: 9,
    },
  },
  {
    title: 'AI는 뷰의 발명자다',
    raw: '인류가 만든 모든 뷰는 그 시대의 기술 한계 안에서 나온 것이다. 표는 종이 시대, 차트는 통계학, 칸반은 도요타 공장, 피드는 트위터에서 나왔다. 데이터를 가장 잘 보여주는 방식이라는 보장이 없다. OU의 AI 뷰 생성기는 기존 뷰 중 골라주는 게 아니라, 데이터에 최적인 뷰를 발명한다. 감정 데이터는 차트 대신 파동으로, 학습 진도는 퍼센트 바 대신 지형도로, 습관 데이터는 히트맵 대신 나무가 자라는 형태로 표현할 수 있다. HTML, CSS, JS로 렌더링되니 형태에 제한이 없다. OU는 뷰의 소비자가 아니라 뷰의 생산자다. 세상에 없던 시각화가 OU에서 탄생한다.',
    domain_data: {
      category: 'paradigm_shift',
      title: 'AI = 뷰의 발명자',
      summary: '기존 뷰는 과거 기술의 산물. AI가 데이터에 최적인 새로운 뷰를 발명한다.',
      tags: ['AI', '뷰생성', '시각화', '발명', '핵심비전'],
      use_cases: ['핵심비전', '투자IR', 'SNS', '소설', '기술블로그'],
      order: 10,
    },
  },
];

/** 관리자 전용 saved_views 정의 */
const PARADIGM_VIEWS = [
  {
    name: '패러다임 인��이트',
    view_type: 'mindmap',
    icon: 'Lightbulb',
    description: 'OU가 대체하는 기존 패러다임들의 연결 맵',
    filter_config: { domain: 'idea', tags: ['패���다임전환'] },
    sort_order: 100,
  },
  {
    name: '마케팅 소스',
    view_type: 'table',
    icon: 'Table',
    description: '제목/요약/태그/용도별 마케팅 소재 테이블',
    filter_config: { domain: 'idea', tags: ['패러다임전환'] },
    sort_order: 101,
  },
  {
    name: '비전 카드',
    view_type: 'document',
    icon: 'Article',
    description: '전문 읽기용. SNS/IR/소설 소재 복사용',
    filter_config: { domain: 'idea', tags: ['패러다임전환'] },
    sort_order: 102,
  },
];

/**
 * 패러다임 전환 인사이트를 관리자 DataNode로 시드
 * - domain: 'idea'
 * - visibility: 'private' + _admin_internal (운영 데이터 보안)
 * - source_type: 'manual'
 * - Layer 3 (임베딩 + 트리플) 자동 트리거
 * - 관리자 전용 saved_views 3개 생성
 */
export async function seedParadigmData(supabaseAdmin: SupabaseClient) {
  // 1. 관리자 유저 조회
  const { data: adminUsers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  let adminUserId: string | null = adminUsers?.[0]?.id ?? null;

  if (!adminUserId) {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const adminAuth = authData?.users?.find(u => u.email === ADMIN_EMAIL);
    adminUserId = adminAuth?.id ?? null;
  }

  if (!adminUserId) {
    throw new Error(`Admin user not found for email: ${ADMIN_EMAIL}`);
  }

  // 2. 기존 노드 중복 체크 (title 기준)
  const { data: existingNodes } = await supabaseAdmin
    .from('data_nodes')
    .select('id, title')
    .eq('user_id', adminUserId)
    .eq('source_type', 'manual')
    .in('title', PARADIGM_NODES.map(n => n.title));

  const existingTitles = new Set(
    (existingNodes ?? []).map((n: { title: string }) => n.title),
  );

  const newNodes = PARADIGM_NODES.filter(n => !existingTitles.has(n.title));

  if (newNodes.length === 0) {
    return { created: 0, skipped: PARADIGM_NODES.length, adminUserId, nodes: [] };
  }

  // 3. DataNode 삽입 (운영 데이터 = private + _admin_internal)
  const insertPayload = newNodes.map(node => ({
    user_id: adminUserId,
    title: node.title,
    domain: 'idea',
    raw: node.raw,
    domain_data: makeAdminInternalDomainData(node.domain_data),
    visibility: 'private' as const,
    confidence: 1.0,
    source_type: 'manual',
    resolution: 'resolved',
    view_hint: 'mindmap',
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('data_nodes')
    .insert(insertPayload)
    .select('id, title');

  if (insertError) {
    throw new Error(`Failed to insert paradigm data: ${insertError.message}`);
  }

  // 4. 각 노드에 sections + sentences 생성 (Layer 3 트리거를 위해)
  const insertedNodes = inserted ?? [];
  for (const node of insertedNodes) {
    const matchingData = newNodes.find(n => n.title === node.title);
    if (!matchingData) continue;

    // section 생성
    const { data: section } = await supabaseAdmin
      .from('sections')
      .insert({
        node_id: node.id,
        heading: matchingData.domain_data.title,
        order_idx: 0,
      })
      .select('id')
      .single();

    if (!section) continue;

    // sentences 분리 및 생성
    const rawSentences = matchingData.raw
      .split(/(?<=[.!?다])\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const sentences = rawSentences.length > 0 ? rawSentences : [matchingData.raw];

    for (let j = 0; j < sentences.length; j++) {
      await supabaseAdmin.from('sentences').insert({
        section_id: section.id,
        node_id: node.id,
        text: sentences[j],
        order_idx: j,
        embed_status: 'pending',
        embed_tier: 'hot',
      });
    }
  }

  // 5. Layer 3 비동기 트리거 (임베딩 + 트리플 추출)
  import('../pipeline/layer3').then(({ embedPendingSentences, extractTriples }) => {
    for (const node of insertedNodes) {
      embedPendingSentences(node.id).catch(e =>
        console.error(`[ParadigmSeed] embed failed for ${node.title}:`, e),
      );
      extractTriples(node.id).catch(e =>
        console.error(`[ParadigmSeed] triple failed for ${node.title}:`, e),
      );
    }
  }).catch(() => {});

  // 6. 관리자 전용 saved_views 생성 (중복 방지)
  const { data: existingViews } = await supabaseAdmin
    .from('saved_views')
    .select('name')
    .eq('user_id', adminUserId)
    .in('name', PARADIGM_VIEWS.map(v => v.name));

  const existingViewNames = new Set(
    (existingViews ?? []).map((v: { name: string }) => v.name),
  );

  const newViews = PARADIGM_VIEWS.filter(v => !existingViewNames.has(v.name));

  let viewsCreated = 0;
  if (newViews.length > 0) {
    const viewPayload = newViews.map(v => ({
      user_id: adminUserId,
      name: v.name,
      view_type: v.view_type,
      icon: v.icon,
      description: v.description,
      filter_config: v.filter_config,
      sort_order: v.sort_order,
      visibility: 'private' as const,
    }));

    const { data: viewsInserted, error: viewError } = await supabaseAdmin
      .from('saved_views')
      .insert(viewPayload)
      .select('id, name');

    if (viewError) {
      console.error(`[ParadigmSeed] views insert failed: ${viewError.message}`);
    }
    viewsCreated = viewsInserted?.length ?? 0;
  }

  return {
    created: insertedNodes.length,
    skipped: existingTitles.size,
    viewsCreated,
    adminUserId,
    nodes: insertedNodes,
  };
}
