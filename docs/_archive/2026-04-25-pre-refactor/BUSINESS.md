# OU — BUSINESS.md

> 수익화, 구독, 마켓, 교육 시장

---

## 수익 모델

### 1. 구독 (SaaS)
| 플랜 | 가격 | LLM | 토큰 |
|------|------|-----|------|
| Free | 0 | Haiku | 제한적 |
| Pro | TBD | Sonnet 4.5 | 넉넉 |
| Team | TBD | Sonnet 4.5 | 팀 공유 |

### 2. 뷰 마켓
- 회원이 만든 뷰를 판매 (`market_items`)
- 뷰 = SaaS. 캘린더뷰, 학습뷰, 분석뷰 등
- OU가 수수료 수취

### 3. BYOK (Bring Your Own Key)
- 무료 유저도 자기 API 키로 고급 모델 사용 가능
- OU는 인프라 비용만 부담 (DB, 호스팅)

---

## 교육 시장

### 타겟
- 한의학 학습 (본초, 방제, 상한론)
- 한자 학습 (급수별 체계)
- 범용 학습 (플래시카드, 퀴즈 뷰)

### 차별점
- 대화로 학습 → 자동 정리 → 뷰로 복습
- 관리자 구축 참조 DB + 개인 학습 데이터
- 그래프뷰로 개념 간 관계 시각화

---

## 결제

- Stripe 연동
- `subscriptions` 테이블: plan, token_limit, period
- `market_purchases` 테이블: item_id, buyer_id, price_paid
