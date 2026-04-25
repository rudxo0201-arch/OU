# OU Design System — Governance

## DS 신규 컴포넌트 추가 절차

DS는 *진입을 막는 벽이 아니라 모든 신규 UI 컴포넌트의 정식 등록처*다.
새 UI에 새 컴포넌트가 필요하면 DS에 추가하면 된다. 우회로 만드는 것이 금지다.

### 절차

1. **발견** — 신규 UI 작업 중 기존 DS로 표현 불가능한 패턴 발견.
2. **RFC 작성** — 작업자(Claude 포함)가 PR 또는 채팅에 다음을 포함한 간단한 제안 작성:
   - 이름 (예: `OuTimelineItem`)
   - 용도 (언제 쓰는가, 어떤 문제를 푸는가)
   - 기존 DS 컴포넌트로 표현할 수 없는 이유
   - API draft (`props` 초안)
3. **사용자 인준** — 사용자 승인 후 진행.
4. **구현** (인준 후에만):
   ```
   src/components/ds/<Name>.tsx        # 컴포넌트 파일
   src/components/ds/index.ts          # export 추가
   src/components/ds/registry.ts       # DS_COMPONENTS 배열에 DsComponentMeta 추가
   src/components/ds/_examples/<Name>.tsx  # 예시 파일 (선택)
   ```
5. **Product 코드에서 사용** — `import { Name } from '@/components/ds'`

### 금지 사항

- DS를 우회한 inline JSX (예: `<button style={{...}}>`, 카드형 `<div style={{ borderRadius, background }}>`)
- 부득이한 임시 우회는 `// TODO(ds): <Name>` 주석 후 위 절차 진행.

### Instance 수정 결정 게이트 (미래 Phase 4)

DS 컴포넌트의 instance를 수정할 때 두 가지 선택지:
1. **master 흡수** — 변경이 모든 instance에 적용되어야 한다면 → DS 컴포넌트 파일을 직접 수정 (=master 업데이트, 모든 instance 동기화).
2. **새 컴포넌트로 detach** — 변경이 이 맥락에만 필요하다면 → 새 파일(`src/components/.../<Name>.tsx`) 작성 후 RFC 제출.

---

## DS Master/Instance 동기화 모델 (개요)

| 개념 | 코드 대응 |
|---|---|
| **master** | `src/components/ds/<Name>.tsx` 파일 |
| **instance** | product 코드에서의 `<Name />` JSX 사용처 |
| master 수정 → 동기화 | 파일 수정 → 모든 import 지점에 자동 반영 |
| instance override | `style`/`className` prop 전달 — 가급적 하지 않음. 필요 시 variant 추가 또는 detach |

Phase 3에서 `src/components/ds/instances.generated.json` (AST 스캔 결과)으로 "OuButton — 47 instances, 5 overrides" 시각화 예정.
