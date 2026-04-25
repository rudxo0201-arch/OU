---
description: ou-verifier 에이전트로 최근 변경사항의 런타임 검증 실행. 기능 + 디자인 자동 검증.
---

ou-verifier 에이전트를 invoke하여 런타임 검증을 실행해주세요.

범위 힌트: $ARGUMENTS
(예: "landing", "orb routes", "widgets", "all", 또는 비워두면 git diff 자동 범위)

검증 완료 후 pass/fail 결과 + 증거 경로를 보고해주세요.
스크린샷 diff fail이 있다면 의도된 변경인지 사용자에게 먼저 확인하세요.
