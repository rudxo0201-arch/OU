/**
 * OU 마이크로카피 시스템
 * 모든 사용자 대면 텍스트의 중앙 관리소
 * 톤: 따뜻한 튜터, 토스 스타일
 */

export const COPY = {
  // ─── 진행 격려 ───
  progress: {
    first_node: '첫 번째가 생겼어요!',
    nodes_3: '벌써 3개나 모았어요',
    nodes_5: '5개! 유니버스가 넓어지고 있어요',
    nodes_10: '10개를 넘었어요. 점점 빛나고 있어요',
    nodes_50: '50개! 정말 많이 쌓았네요',
    nodes_100: '100개 돌파! 멋진 유니버스예요',
    streak_3: '3일 연속이에요! 꾸준함이 빛나요',
    streak_7: '7일 연속! 대단해요',
    streak_30: '30일 연속! 이 유니버스, 정말 살아있어요',
    new_connection: '새로운 연결을 발견했어요',
    connections_found: (n: number) => `관계 ${n}개를 찾았어요`,
    universe_growing: '유니버스가 점점 채워지고 있어요',
  },

  // ─── 기능 해금 ───
  unlock: {
    suggest: '이런 것도 할 수 있어요. 해볼까요?',
    confirm: '완성했어요! 바로 써보세요',
    highlight: '읽으면서 중요한 부분 표시하고 싶지 않아요?',
    split_view: '다른 자료랑 나란히 보고 싶지 않아요?',
    quiz: '이걸로 퀴즈 만들어볼까요?',
    auto_link: '비슷한 내용끼리 연결해드릴까요?',
    daily_card: '매일 하나씩 복습해볼까요?',
    chart: '이걸 차트로 보면 더 재밌을 것 같아요',
    new_ability: '새로운 걸 해볼 준비가 된 것 같아요',
  },

  // ─── 넛지 ───
  nudge: {
    save_guest: '이걸 저장하고 계속 쌓아보세요',
    come_back: '어제 이야기하던 거, 이어서 해볼까요?',
    inactive_3d: '유니버스가 조용해요. 별들이 기다리고 있어요',
    collection_almost: (remaining: number) => `완성까지 ${remaining}개 남았어요`,
    almost_done: '거의 다 왔어요, 마저 해볼까요?',
    explore_others: '다른 사람들은 이것도 해봤어요',
    share_suggest: '이거 다른 사람들도 관심 있어할 것 같아요',
    sell_suggest: '유료로 전환해볼까요?',
  },

  // ─── 에러 / 실패 ───
  error: {
    network: '잠깐 연결이 끊겼어요. 다시 시도해볼게요',
    generic: '앗, 문제가 생겼어요. 잠시 후 다시 해볼게요',
    retry: '괜찮아요, 다시 해볼까요?',
    upload_fail: '파일을 받는 데 문제가 생겼어요. 다시 올려볼까요?',
    too_large: '파일이 좀 큰 것 같아요. 조금 더 작은 파일로 해볼까요?',
    not_found: '찾을 수 없었어요',
    unauthorized: '로그인이 필요해요',
  },

  // ─── 빈 상태 ───
  empty: {
    no_nodes: '아직 비어있어요. 아무거나 말해보세요!',
    no_results: '검색 결과가 없어요',
    no_views: '아직 만든 뷰가 없어요',
    no_connections: '아직 연결이 없어요. 더 이야기해보면 생길 거예요',
    no_notifications: '새 소식이 없어요',
  },

  // ─── 알람 / 리마인더 ───
  alarm: {
    morning_greeting: '좋은 아침이에요!',
    morning_todo: '오늘 할 일이에요',
    review_remind: (topic: string) => `${topic}, 아직 기억나요?`,
    streak_keep: '오늘도 이어갈까요?',
  },

  // ─── 마켓 ───
  market: {
    purchase_success: '구매 완료! 바로 확인해보세요',
    earn_node: '+1 유니',
    earn_streak: '+10 유니! 오늘도 꾸준하네요',
    earn_quiz: '+5 유니!',
    earn_review: '+3 유니! 검토해주셔서 고마워요',
    balance: (amount: number) => `${amount.toLocaleString()} 유니`,
    followers_milestone: (n: number) => `팔로워 ${n}명 돌파!`,
  },

  // ─── 확인 / 검수 ───
  verify: {
    link_confirm: '이 연결, 맞는 것 같아요?',
    link_yes: '맞아요',
    link_no: '아니에요',
    link_unsure: '잘 모르겠어요',
    link_custom: '직접 쓸게요',
  },

  // ─── 임포트 ───
  import: {
    received: (count: number) => `파일 ${count}개를 받았어요. 잠깐만요...`,
    processing: '살펴보고 있어요...',
    done: (connections: number) => `다 봤어요. 관계 ${connections}개를 찾았어요`,
    review_needed: (count: number) => `${count}개는 확인이 필요해요. 볼래요?`,
    see_results: '볼래요?',
  },
} as const;

export type CopyKey = keyof typeof COPY;
