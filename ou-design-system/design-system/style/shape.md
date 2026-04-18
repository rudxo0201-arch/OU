# 형태 (Shape)

> KRDS 참조: 5단계 Radius, 그림자 체계

## Border Radius **[DO]**

> 5단계 체계. 컴포넌트 크기에 대응하여 사용.

| 단계 | Mantine | 값 | 용도 |
|------|---------|---|------|
| **XSmall** | `xs` | 2px | 인풋 필드, 배지 |
| **Small** | `sm` | 4px | 칩, 태그, 작은 버튼 |
| **Medium** | `md` | 8px | 카드, 버튼, 모달 **(기본)** |
| **Large** | `lg` | 12px | 큰 카드, 패널 |
| **XLarge** | `xl` | 16px | 히어로, 특수 컨테이너 |
| **Full** | — | 9999px | 원형 버튼, 아바타 |

> `defaultRadius: 'md'` (theme.ts)

## 그림자 (Elevation)

| 수준 | Light Mode | Dark Mode | 용도 |
|------|-----------|-----------|------|
| **Level 0** | none | none | 기본 (보더만) |
| **Level 1** | `0 2px 8px rgba(0,0,0,0.06)` | `0 0 16px rgba(255,255,255,0.04)` | 카드, 패널 |
| **Level 2** | `0 4px 16px rgba(0,0,0,0.08)` | `0 0 24px rgba(255,255,255,0.06)` | 드롭다운, 모달 |
| **Level 3** | `0 8px 32px rgba(0,0,0,0.12)` | `0 0 32px rgba(255,255,255,0.08)` | 오버레이 |

> OU 기본: Level 0 (보더만). Paper 컴포넌트는 `shadow: 'none'`, `border: 0.5px solid`

## 보더

| 속성 | 값 | 변수 |
|------|---|------|
| 기본 두께 | 0.5px | — |
| 색상 | 자동 (테마) | `var(--mantine-color-default-border)` |
| 스타일 | solid | — |

## 트랜지션 **[BETTER]**

| 속성 | 값 | 용도 |
|------|---|------|
| 기본 | `200ms ease` | 대부분의 인터랙션 |
| 빠른 | `150ms ease` | 호버, 포커스 |
| 느린 | `300ms ease` | 패널 열기/닫기, 모달 |
| 스프링 | `400ms cubic-bezier(0.4, 0, 0.2, 1)` | 특수 애니메이션 |
