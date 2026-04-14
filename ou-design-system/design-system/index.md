# OU Design System

> KRDS(디지털 정부서비스 UI/UX 가이드라인) 포맷을 참조하여 구성.
> 5단계 계층 구조: 원칙 → 스타일 → 컴포넌트 → 기본 패턴 → 서비스 패턴

## 문서 구조

```
src/design-system/
├── index.md                 ← 이 파일 (전체 목차)
├── principles.md            ← 1단계: 디자인 원칙
├── style/
│   ├── colors.md            ← 색상 시스템
│   ├── typography.md        ← 타이포그래피
│   ├── spacing.md           ← 간격 & 그리드
│   ├── shape.md             ← 형태 (반지름, 그림자)
│   └── icons.md             ← 아이콘 규칙
├── components.md            ← 컴포넌트 카탈로그
├── patterns.md              ← 기본 패턴 (공통 과업)
├── service-patterns.md      ← 서비스 패턴 (사용자 여정)
├── responsive.md            ← 반응형 규칙
├── accessibility.md         ← 접근성 기준
└── ux-flows.md              ← UX 플로우 (기 작성)
```

## 적용 수준 (KRDS 참조)

| 수준 | 표기 | 의미 |
|------|------|------|
| 필수 | **DO** | 미준수 시 사용성 저하 |
| 권장 | **BETTER** | 미준수 시 경험 품질 저하 |
| 우수 | **BEST** | 준수 시 차별화된 경험 |

## Figma 파일 대응

| 문서 | Figma 파일 |
|------|-----------|
| 스타일 토큰 | OU — Design System |
| 컴포넌트 | OU — UI Components |
| 패턴/페이지 | OU — Page Designs |
| UX 플로우 | OU — UX Flows |
