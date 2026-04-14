# ROADMAP.md — 개발 Phase + 위험 + AI 에이전트 + KPI

---

## 개발 Phase

### Phase 0 — 기반 (현재)
```
[✓] DATA_STANDARD.md
[✓] FRONTEND_DESIGN.md
[✓] PLANNING.md (인덱스)
[✓] VISION / DATA / PLATFORM / VIEWS / BUSINESS / TECH / ROADMAP
[ ] DB_SCHEMA.sql
[ ] CLAUDE.md 개정
[ ] 기술 스택 셋업 (완전 처음부터)
```

### Phase 1 — MVP (OU-Chat)
```
[ ] 인증 (소셜 + 이메일 verify + 관리자 2FA)
[ ] OU-Chat:
    스트리밍 응답 / 중단/취소
    이미지 첨부 (Gemini Vision OCR)
    텍스트 붙여넣기 (부고문자, 청첩장 등)
    LLM → DataNode 파이프라인 (Layer 1/2/3)
    트리플화 프롬프트 엔지니어링
    비로그인 5턴 → 저장 유도 (훅 타이밍 3가지)
[ ] 기본 데이터뷰 3종 (캘린더, 태스크, 그래프)
[ ] 데이터뷰 추천 (규칙 기반)
[ ] 정확도 높이기 (/accuracy)
[ ] 개인 그래프뷰 (/my)
[ ] 기본 공개/공유 (private/link/public)
[ ] 관리자 패널 (보안 강화 + 기본 DB 관리)
[ ] 킬러 데모 시나리오 완성
```

### Phase 2 — 인풋 확대
```
[ ] 파일 업로드 (PDF 먼저, R2 연동)
[ ] 원본 파일 ↔ DataNode 양방향 연결
[ ] OU 내장 뷰어 (PDF.js 먼저)
[ ] ou-study YouTube 연동
[ ] 파일 파서 확대 (PPT, HWP 순)
[ ] 뷰 구독 시스템
[ ] 그룹 기본 (공동 DB + 공동 뷰 + 알림)
[ ] 데이터뷰 커스텀 레이어 2~3
[ ] AI 뷰 생성기 베타 (Claude Code 연동)
[ ] 광고 + Pro 구독 수익화
[ ] 검증 에이전트 (주간 배치)
```

### Phase 3 — 생태계
```
[ ] SNS 채널 (/feed)
[ ] OU 채팅 (/messages) — DataView 메시지 + 언어 중립
[ ] 크리에이터 수익화 + 마켓플레이스
[ ] B2B 교육 (학교/학원 Team 플랜)
[ ] pgvector → Pinecone 전환
[ ] Supabase → Neon 마이그레이션 (필요 시)
```

### Phase 4 — .ou 시대
```
[ ] .ou 파일 포맷 표준화
[ ] OU 내 모든 파일 형식 편집 완결
[ ] 그래프뷰 게임 생태계 (스킨/효과 마켓)
[ ] 글로벌 교육 시장 진출
```

---

## 위험 요소

### 비즈니스 위험

```
1. LLM API 비용 폭발
   사용자 증가 → API 비용이 수익 초과
   대응: Haiku 배치 우선, 토큰 제한, api_cost_log 실시간 모니터링

2. 데이터 품질 저하
   LLM hallucination → 잘못된 DataNode 확산
   대응: confidence 필드, 검증 에이전트, 오류 신고 시스템

3. PMF 미달 (사용자 이탈)
   킬러 루프 감동 없음
   대응: 킬러 데모 먼저 완성, 온보딩 A/B 테스트, DAU/WAU 추적

4. 경쟁사 빠른 모방
   대형 플랫폼 유사 기능 출시
   대응: 트리플 온톨로지 해자 먼저 구축
         사용자 DataNode 축적으로 이탈 불가 구조
         .ou 포맷 표준화로 생태계 선점
```

### 기술 위험

```
5. Supabase 장애/정책 변경
   대응: PostgreSQL 표준 사용 → Neon 마이그레이션 준비

6. LLM 프로바이더 장애
   대응: 멀티 프로바이더 추상화 → 자동 Fallback

7. 보안 침해 (개인 DataNode 유출)
   대응: RLS 철저, API 키 서버사이드 only, 정기 보안 감사

8. 파일 파서 불안정
   파싱 실패 시 데이터 손실
   대응: 원본 파일 R2 보존 최우선 (파싱 실패해도 원본은 보존)
```

---

## 기술적 어려움

```
난이도 상:
  트리플화 LLM 프롬프트 엔지니어링
    자연스러운 문장 + 정확한 트리플 + 서술어 목록 준수 동시 충족
    지속적 튜닝 필요

  그래프뷰 60fps 성능
    수만 노드 WebGL / d3-force Worker / LOD, 컬링, 배칭

  실시간 공동 편집 충돌
    Last-write-wins or OT/CRDT

  언어 중립 렌더링
    번역 품질 + 비용 + 속도 트레이드오프

난이도 중:
  파일 형식별 파서 (PDF, PPT, HWP 각각 다른 구조)
  AI 뷰 생성기 샌드박스 (Claude Code 코드 안전 실행)
  벡터 + SQL 하이브리드 검색 랭킹

난이도 하:
  온보딩 대화 흐름
  토큰 게이지 UI
  구독 알림 시스템
```

---

## 병목 요소

```
병목 1: 기본 DB 구축 속도
  해결: ou-study 자동화 파이프라인 우선
        Wikipedia/ISBN API 자동 수집
        UNRESOLVED 엔티티 자동 추가 큐

병목 2: LLM 응답 지연
  해결: 스트리밍 응답 (체감 지연 최소화)
        Layer 1/2/3 완전 분리 (비동기)

병목 3: 파일 파서 개발 공수
  해결: PDF 먼저, 순차적으로
        파싱 실패해도 원본 저장은 항상 성공

병목 4: 뷰 렌더링 엔진 다양성
  해결: 뷰 레지스트리 플러그인 구조
        기본 뷰 먼저, AI 뷰 생성기로 커버 확대

병목 5: 사용자 수준 파악 정확도
  해결: 일단 저장 원칙, 정확도 높이기 탭 수동 보완
```

---

## AI 에이전트 (10개 부서)

```
1. DataNode 생성 에이전트
   역할: 채팅/파일 → DataNode 구조화
   트리거: 메시지 전송, 파일 업로드
   모델: Layer 1 Sonnet (실시간), Layer 2~3 Haiku (배치)

2. 트리플 추출 에이전트
   역할: sentences → triples (표준 서술어 준수)
   트리거: Layer 3 백그라운드
   모델: Claude Haiku

3. 임베딩 에이전트
   역할: sentences → 벡터 임베딩
   트리거: 백그라운드 큐
   모델: text-embedding-3-small

4. UNRESOLVED 해소 에이전트
   역할: 맥락 분석 → 엔티티 자동 해소 시도
   트리거: 새 메시지 수신 시
   모델: Claude Haiku

5. 검증 에이전트
   역할: DataNode 신뢰도/정확도 주기 검증
   트리거: 주간 배치
   모델: Claude Haiku + 외부 API 대조

6. 추천 에이전트
   역할: DataNode 패턴 분석 → 뷰 추천
   트리거: DataNode 임계값 도달, 주간 다이제스트
   모델: 규칙 기반 → 점차 ML

7. AI 뷰 생성 에이전트
   역할: 자연어 → HTML/CSS/JS 뷰 생성 (샌드박스)
   트리거: 사용자 요청 (Pro)
   모델: Claude Sonnet

8. 비용 모니터링 에이전트
   역할: API 비용 이상 감지 → 관리자 알림
   트리거: 실시간 (임계값 초과 시)
   모델: 규칙 기반

9. 기본 DB 구축 에이전트
   역할: 외부 소스 크롤링 → DataNode 자동 생성
   트리거: 일간/주간 스케줄
   모델: Claude Haiku + 외부 API (ISBN, TMDB 등)

10. 파일 파서 에이전트
    역할: PDF/PPT/HWP → sections/sentences 추출
    트리거: 파일 업로드 시
    모델: Gemini Vision (이미지/OCR) + 파서 라이브러리

11. 가이드/설명서 에이전트
    역할:
      A) 설명서 자동 생성
         서비스 기능 DataNode → 사용자 수준별 가이드 DataView 생성
         텍스트 / 스크린샷 / 인터랙티브 튜토리얼 형태로
      B) UX 배치 결정
         사용자 행동 패턴 분석
         → 어떤 기능을 언제 모르는지 감지
         → 적절한 위치/시점에 가이드 노출
         (툴팁 / 코치마크 / 모달 / 채팅 인라인 / 홈 추천카드)
    트리거:
      신규 기능 배포 시 → 자동 가이드 생성
      사용자가 특정 기능에서 막힘 감지 → 컨텍스트 가이드 노출
      신규 가입 온보딩 → 단계별 가이드 생성
    모델: Claude Sonnet (가이드 문서 생성)
    특이점:
      가이드 자체가 DataView (시스템 DataNode → 가이드뷰)
      사용자 수준(userLevel)에 따라 다른 가이드 렌더링
      beginner → 쉬운 말 + 스크린샷 위주
      expert   → 간결한 텍스트 + 단축키 위주
```

---

## 성공 지표 (KPI)

```
Phase 1 (MVP):
  DAU > 100
  채팅 → 뷰 전환율 > 30%
  D7 리텐션 > 20%
  킬러 데모 완주율 > 60%

Phase 2:
  DAU > 1,000
  Pro 전환율 > 5%
  파일 업로드 사용자 > 20%

Phase 3:
  DAU > 10,000
  그룹 생성 사용자 > 10%
  크리에이터(뷰 발행) > 1%
  MRR > $10,000

Phase 4:
  DAU > 100,000
  .ou 파일 공유 수
  글로벌 사용자 비율
```
