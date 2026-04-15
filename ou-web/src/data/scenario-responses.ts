/**
 * 시나리오별 사전 생성 응답
 * LLM 호출 없이 캐시된 응답을 반환 → 비용 0
 */

export const SCENARIO_RESPONSES: Record<string, string> = {
  'schedule-demo':
    '다음주 금요일 7시 강남역 모임, 기록했어요! 📅 캘린더에서 날짜를 확인하고, 📍 지도에서 장소를 볼 수 있어요. 모임 전에 알려드릴까요?',

  'finance-demo':
    '오늘 지출 기록했어요!\n\n• 김밥 8,000원 (식비)\n• 커피 4,500원 (식비)\n• 택시 12,000원 (교통)\n\n총 24,500원이에요. 📊 차트에서 카테고리별 지출을 한눈에 볼 수 있어요.',

  'task-demo':
    '할 일 3개 정리했어요!\n\n✅ 리포트 — 금요일까지\n✅ 세탁소 — 내일\n✅ 엄마 전화\n\n📋 보드에서 진행 상태를 관리할 수 있어요. 완료하면 말씀해주세요!',

  'emotion-demo':
    '오늘 하루 기록했어요. 야근이 길었지만 프로젝트를 마무리한 뿌듯함도 있었네요. 고생 많으셨어요 💪\n\n📔 일기장에서 감정 흐름을 돌아볼 수 있어요.',

  'habit-onboard':
    '러닝 30분 완료! 대단해요 🏃\n\n🟩 잔디에 오늘 기록이 추가됐어요. 매일 기록하면 잔디가 채워지는 걸 볼 수 있어요.',

  'relation-onboard':
    '희민님 정보 기록했어요!\n\n👤 희민 — 대학 친구\n🎂 생일: 5월 3일\n📱 010-1234-5678\n\n👥 관계 카드에서 한눈에 볼 수 있어요. 생일이 다가오면 알려드릴게요!',

  'meeting-active':
    '마케팅 회의 내용 정리했어요!\n\n📋 4월 캠페인 — 예산 500만원, 마감 4/25\n👤 담당: 수진\n\n캘린더에 마감일, 보드에 할 일, 관계에 담당자가 각각 기록됐어요.',

  'idea-active':
    '아이디어 저장했어요! 💡\n\n"음성 메모 → 자동 정리" 기능 아이디어를 기록해뒀어요. 나중에 관련 아이디어가 더 생기면 말씀해주세요. 연결해서 보여드릴게요.',

  'reading-active':
    '독서 메모 저장했어요! 📚\n\n사피엔스 42쪽: "인지혁명이 호모 사피엔스를 지구 지배종으로 만들었다"\n\n🔗 지식 그래프에서 다른 메모와의 연결을 볼 수 있어요.',

  'gift-active':
    '선물 기록했어요! 🎁\n\n희민님 생일에 향수 선물 — 50,000원\n\n👥 관계 카드에 선물 이력이 추가됐고, 📊 지출에도 기록됐어요.',
};

/** 시나리오 프롬프트인지 판별 */
export function findScenarioResponse(userMessage: string): { id: string; response: string } | null {
  // scenarios.ts의 prompt와 정확히 일치하는지 확인
  const PROMPT_MAP: Record<string, string> = {
    '다음주 금요일 7시 강남역에서 친구 모임': 'schedule-demo',
    '점심 김밥 8000원, 커피 4500원, 택시 12000원': 'finance-demo',
    '리포트 금요일까지, 세탁소 내일 가기, 엄마한테 전화하기': 'task-demo',
    '오늘 좀 지쳤다. 야근이 길었는데 그래도 프로젝트 마무리해서 뿌듯': 'emotion-demo',
    '오늘 러닝 30분 완료': 'habit-onboard',
    '희민이 생일 5월 3일, 대학 친구, 010-1234-5678': 'relation-onboard',
    '오늘 마케팅 회의: 4월 캠페인 예산 500만원, 담당 수진, 마감 4월 25일': 'meeting-active',
    '앱에서 음성으로 메모하면 자동 정리되는 기능 만들면 좋겠다': 'idea-active',
    '사피엔스 42쪽: 인지혁명이 호모 사피엔스를 지구 지배종으로 만들었다': 'reading-active',
    '희민이 생일에 향수 선물함 5만원': 'gift-active',
  };

  const scenarioId = PROMPT_MAP[userMessage.trim()];
  if (!scenarioId) return null;

  const response = SCENARIO_RESPONSES[scenarioId];
  if (!response) return null;

  return { id: scenarioId, response };
}
