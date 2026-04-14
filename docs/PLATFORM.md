# PLATFORM.md — 플랫폼 레이어 구조

---

## 레이어 1: 개인 유니버스

```
로그인 → 내 DB → 내 뷰 → 생산성

플라이휠:
  대화할수록 → DataNode 증가 → 엣지 자동 형성
  → 그래프 정교해짐 → 개인화 응답
  → 더 대화하고 싶어짐 → 반복
```

---

## 레이어 2: 그룹 유니버스

```
카톡 그룹과 차원이 다르다.

카톡: 텍스트/파일 교환 → 정보가 채팅방에 묻힘 → 재탐색 불가
OU:   DataNode 직접 교환 → DB에 구조화 → 언제든 필터/검색 + 공동 편집

카톡이 대화를 연결했다면, OU는 데이터를 연결한다.
```

### 한의대 케이스

```
기존:
  과대: 시간표 이미지 제작 → 카톡 공지
  학생: 저장 → 못 찾음 → 다시 물어봄 → 반복
  총 마찰: 매주, 50명 × N번

OU:
  과대: 시간표 DataNode 수정 (1번)
  학생 50명: 자동 업데이트 확인
  총 마찰: 0

공동 과제 칸반:
  학년 전체가 Editor
  누구든 과제 추가 → 전체 자동 반영
  마감 N일 전 알림
```

### 그룹 구성

```
멤버 + 공동 DB + 공동 뷰 + 채팅 + 구독 뷰

권한:
  Owner    생성자. 모든 권한. 뷰 삭제 가능.
  Editor   데이터 추가/수정/삭제
  Viewer   읽기 전용 (구독자)

초대: 링크 / 계정 / 그룹 (학교/조직)
```

---

## 레이어 3: 구독 시스템

```
뷰 소유 모델:
  A) 개인 뷰:     나만 편집
  B) 구독 뷰:     소유자 편집 → 구독자 자동 업데이트
  C) 공동 편집 뷰: 여러 명 편집 → 구독자 최신 상태

아이콘 구분 (사이드바):
  내 뷰:   흰 아이콘
  구독 뷰: 아이콘 + @ 배지
  공동 뷰: 아이콘 + 👥 배지

사례:
  과대 "시간표 뷰" 구독 → 데이터 수정만 해도 전체 반영
  유명 한의사 "처방 뷰" 유료 발행 → 크리에이터 이코노미 시작
```

---

## 레이어 4: SNS 채널

```
기존 SNS가 하는 일 전부 = DataNode + DataView
OU는 이미 이 구조로 설계되어 있다.

프로필뷰:
  내 DataNode 중 공개 선택한 것들의 렌더링
  뷰 형식은 내가 선택 (그래프/타임라인/포트폴리오...)
  링크드인/페북 프로필 따로 안 만들어도 됨

피드뷰:
  구독한 사람들의 DataNode 시간순 렌더링
  텍스트/이미지/영상 대신 DataView를 공유
  받은 사람은 내 DB에 가져올 수 있음

상호작용 = DataNode:
  좋아요 → {subject: 나, predicate: likes, object: 그 DataNode}
  댓글   → 새 DataNode + 원본과 relation 연결
  공유   → DataView를 내 우주에 가져오기
  팔로우 → 구독 시스템 (이미 설계됨)
  → 상호작용 자체가 데이터로 쌓임

언어 중립:
  한국인이 올린 지식 그래프
  → 일본인에게 일본어로 렌더링
  → 기존 SNS는 불가능

광고:
  인기 DataNode/뷰 열람 시 광고 노출
  인플루언서 마케팅 = 크리에이터 DataNode 구독
  라이브 커머스 = 영상 DataNode + 실시간 구매뷰

→ SNS 광고 시장 + 크리에이터 이코노미 전부 흡수 가능
```

---

## 레이어 5: OU 채팅

```
기존 카톡: 이미지/파일/텍스트 전송 → 단순 파일
OU 채팅:  DataView 전송 → 채팅창에 렌더링

언어 중립 혁신:
  보내는 것: DataNode (언어 중립 데이터)
  받는 것:   각자의 언어 설정으로 렌더링

  한국인 → 영어권:
    나는 한글로 작성 → 상대방은 영어로 봄
    번역 불필요, 원본 무손실

  기존 번역: 텍스트 → AI 번역 → 다른 텍스트 (손실)
  OU 번역:  DataNode 자체가 언어 중립 → 렌더링 시 언어 적용 (무손실)

외국 PPT 받을 때:
  영어 PPT → 내 화면에서 한국어 PPT로 렌더링
  AI 번역 따로 돌릴 필요 없음
```

---

## 레이어 6: 생태계 (크리에이터 이코노미)

```
유튜브 모델: 플랫폼 - 생산자 - 유저 삼각 구조

수익화:
  뷰 구독 수익 (유료 구독, OU 수수료)
  노드 거래 (무료/유료, OU 수수료)
  뷰 템플릿 판매 (마켓플레이스)
  스킨/효과 판매 (그래프뷰 게임)
```

---

## 레이어 7: 그래프뷰 게임

```
우주 시각화:
  노드 = 별/항성/행성
  엣지 = 중력/관계
    초기: SQL 기반 엣지
    추후: 트리플 값이 가까운 것끼리 자동 엣지 형성
  클러스터 = 성운

게임 요소:
  스킨/테마 커스텀 + 구매
  중력 엔진 파라미터 조절 (인력/척력/궤도)
  탐험 메카닉 (미지의 영역 = 아직 학습 안 한 것)
  수집 욕구 (쌓을수록 우주 성장)

공개/비공개:
  기본값: private (나만보기)
  공개는 사용자가 명시적으로 선택
  개인정보 도메인 (relation/emotion/finance) 공개 시 자동 경고
```

---

## .ou 파일 — 궁극적 목표

```
현재 (호환성 시대):
  데이터 → PPT/Docs/PDF 익스포트 → 다른 앱에서 편집
  굳이 다른 프로그램으로 가져가서 편집해야 함

미래 (.ou 시대):
  .ou 파일로 통합
  굳이 다른 프로그램으로 가져갈 필요가 없어짐
  OU 안에서 모든 편집 완결

.ou 구조:
{
  nodes: [...],
  edges: [...],
  views: [...],
  metadata: { version, owner, language, created }
}

Word가 .docx를 만들었듯 OU는 .ou를 만든다.
  .docx = 문서 포맷
  .ou   = 데이터 + 뷰의 분리된 포맷 (언어 중립, 무한 렌더링)
```

---

## 멀티 페르소나 시스템

### 개념

```
1인 1계정 원칙 유지
페르소나 = 어떤 DataNode를 공개할지의 설정
         = 프로필뷰의 필터 설정
         = 기존 SNS 멀티계정을 1계정으로 흡수
```

### 구조

```
회원 A (1계정)
  ├── 페르소나 1: "한의대생 @hanu_minjon"
  │     공개 DataNode: 한의학 지식, 학습 기록
  │     프로필뷰: 지식 그래프 스타일
  │     팔로워: 한의대생들
  │
  ├── 페르소나 2: "독서가 @reader_minjon"
  │     공개 DataNode: 독서 기록, 독후감
  │     프로필뷰: 책장 그리드 스타일
  │     팔로워: 독서 커뮤니티
  │
  └── 기본 (나만 보기)
        모든 DataNode 통합 접근
        페르소나 간 숨겨진 연결 모두 보임
        = 나만 아는 진짜 전체 우주
```

### 페르소나 프라이버시

```
외부에서 보이는 것:
  각 페르소나 우주는 분리되어 보임
  페르소나 간 연결 숨김 가능
  같은 사람인지조차 모를 수 있음

나만 보이는 것 (로그인):
  전체 우주 = 모든 페르소나 DataNode 통합
  "한의학 개념"과 "읽은 책"의 연결이 보임
  페르소나 간 숨겨진 연결도 보임
  → 나만 아는 내 진짜 우주

엣지 공개 설정:
  이 연결은 A 페르소나에서도 보이게
  이 연결은 나만 보이게
  → 세밀한 공개 제어
```

### 같은 DataNode, 다른 노출

```
"태을침 맞았어" DataNode
  한의대생 페르소나: 공개 (경혈/침법 관련 노드와 연결)
  일상 페르소나:    "오늘 몸 관리 중"으로 공개
  독서가 페르소나:  비공개
  → 데이터는 하나, 노출은 페르소나별로 다름
```

### DB 스키마

```sql
CREATE TABLE personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  handle              TEXT UNIQUE NOT NULL,  -- @hanu_minjon
  display_name        TEXT NOT NULL,
  bio                 TEXT,
  avatar_url          TEXT,
  profile_view_config JSONB,   -- 프로필뷰 설정
  is_default          BOOLEAN DEFAULT false,
  visibility          TEXT DEFAULT 'public',
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 페르소나별 DataNode 공개 설정
CREATE TABLE persona_node_visibility (
  persona_id  UUID REFERENCES personas(id) ON DELETE CASCADE,
  node_id     UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  is_visible  BOOLEAN DEFAULT false,  -- 기본: 비공개
  PRIMARY KEY (persona_id, node_id)
);

-- 팔로우는 페르소나 단위
CREATE TABLE persona_follows (
  follower_persona_id  UUID REFERENCES personas(id) ON DELETE CASCADE,
  following_persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_persona_id, following_persona_id)
);
```
