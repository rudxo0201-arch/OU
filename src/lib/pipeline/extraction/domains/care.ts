import type { DomainExtractionConfig } from '../types';

export const config: DomainExtractionConfig = {
  domain: 'care',
  schema: {
    subject_type: 'child | pet | elder | self | other (돌봄 대상 종류)',
    subject_name: '돌봄 대상 이름 또는 호칭 (예: 첫째, 둘째, 바둑이, 아버지)',
    event_type: 'feeding | diaper | sleep | medication | temperature | food_reaction | milestone | other',
    event_data: '이벤트 종류별 세부 데이터 (아래 규칙 참조)',
    occurred_at: 'HH:MM 또는 YYYY-MM-DD HH:MM (기본: 현재 시각)',
    ended_at: 'HH:MM (수면 등 구간 이벤트의 종료 시각)',
    note: '추가 메모 (있으면)',
  },
  requiredFields: ['event_type'],
  rules: `
event_type별 event_data 필드:

feeding (수유/수유):
  amount_ml: 수치만 (예: 120)
  method: bottle | breast | solid (분유/젖/이유식)
  food: 음식명 (이유식/고형식일 때)

diaper (기저귀):
  kind: pee | poop | both (소변/대변/둘다)
  color: 이상 색깔이 있으면 (예: "녹색", "붉은색")

sleep (수면):
  — occurred_at = 잠든 시각, ended_at = 깬 시각
  — "잠 깼어" / "일어났어" → ended_at만 업데이트 의미로 note 명시

medication (투약):
  drug: 약 이름 (예: 타이레놀, 이부프로펜)
  dose: 용량 문자열 (예: "2.5ml", "1정")
  reason: 복용 이유 (예: "발열", "기침")

temperature (체온):
  temperature_c: 수치만 (예: 37.8)
  method: ear | forehead | oral | axillary (귀/이마/구강/겨드랑이, 명시 없으면 생략)

food_reaction (음식 반응):
  food: 음식명
  reaction: 반응 설명 (예: "두드러기", "구토", "괜찮았음")

milestone (발달 이정표):
  description: 이정표 설명 (예: "첫 걸음", "엄마 첫 발화")

규칙:
- subject_type / subject_name이 텍스트에 없으면 null (UI가 따로 주입)
- occurred_at: "10시", "오전 2시" 같은 표현을 HH:MM으로 변환
- 체온 38.0 이상이면 note에 "발열" 추가
- entities는 항상 빈 배열 [] — subject는 domain_data로 관리
`,
  examples: [
    {
      input: '120ml 먹였어',
      output: { event_type: 'feeding', event_data: { amount_ml: 120, method: 'bottle' } },
    },
    {
      input: '둘째 오전 2시 100ml 분유',
      output: {
        subject_name: '둘째',
        event_type: 'feeding',
        occurred_at: '02:00',
        event_data: { amount_ml: 100, method: 'bottle' },
      },
    },
    {
      input: '응가 했어',
      output: { event_type: 'diaper', event_data: { kind: 'poop' } },
    },
    {
      input: '첫째 기저귀 소변',
      output: { subject_name: '첫째', event_type: 'diaper', event_data: { kind: 'pee' } },
    },
    {
      input: '열 38.2도',
      output: {
        event_type: 'temperature',
        event_data: { temperature_c: 38.2 },
        note: '발열',
      },
    },
    {
      input: '타이레놀 2.5ml 먹임',
      output: {
        event_type: 'medication',
        event_data: { drug: '타이레놀', dose: '2.5ml' },
      },
    },
    {
      input: '딸기 먹였는데 두드러기',
      output: {
        event_type: 'food_reaction',
        event_data: { food: '딸기', reaction: '두드러기' },
      },
    },
    {
      input: '첫째 오늘 처음 걸었어',
      output: {
        subject_name: '첫째',
        event_type: 'milestone',
        event_data: { description: '첫 걸음' },
      },
    },
  ],
};
