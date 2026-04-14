# 색상 시스템

> KRDS 참조: 60-30-10 배분 규칙, 10단계 팔레트, WCAG 2.1 AA 준수

## 색상 배분 (60-30-10)

| 비율 | 용도 | OU 적용 |
|------|------|--------|
| **60%** | 배경 | 무채색 (brand 팔레트) |
| **30%** | 보조 | 다크 팔레트, 보더, 서브텍스트 |
| **10%** | 강조 | 인터랙션, CTA, 상태 표시 |

## Brand 팔레트 (10단계)

> OU의 주색은 Grayscale. Black & White, Modern, Futuristic.

| 단계 | HEX | CSS Variable | 용도 |
|------|-----|-------------|------|
| brand.0 | `#f5f5f5` | `--mantine-color-brand-0` | 배경 (가장 밝음) |
| brand.1 | `#e8e8e8` | `--mantine-color-brand-1` | 보더, 구분선 |
| brand.2 | `#d1d1d1` | `--mantine-color-brand-2` | 비활성 텍스트 |
| brand.3 | `#a3a3a3` | `--mantine-color-brand-3` | dimmed 텍스트 |
| brand.4 | `#737373` | `--mantine-color-brand-4` | 보조 텍스트 |
| brand.5 | `#525252` | `--mantine-color-brand-5` | 보조 텍스트 (강조) |
| **brand.6** | **`#1a1a1a`** | `--mantine-color-brand-6` | **Primary — 본문, CTA** |
| brand.7 | `#141414` | `--mantine-color-brand-7` | 강조 hover |
| brand.8 | `#0a0a0a` | `--mantine-color-brand-8` | 강조 active |
| brand.9 | `#000000` | `--mantine-color-brand-9` | 최대 강조 |

## Dark 테마 팔레트 (10단계)

| 단계 | HEX | 용도 |
|------|-----|------|
| dark.0 | `#C9C9C9` | 다크모드 본문 텍스트 |
| dark.1 | `#b8b8b8` | 보조 텍스트 |
| dark.2 | `#828282` | dimmed |
| dark.3 | `#696969` | 비활성 |
| dark.4 | `#424242` | 보더 |
| dark.5 | `#3b3b3b` | 카드 배경 |
| dark.6 | `#2e2e2e` | 섹션 배경 |
| dark.7 | `#242424` | 메인 배경 |
| dark.8 | `#1f1f1f` | 사이드바 배경 |
| dark.9 | `#141414` | 최어두운 배경 |

## 시맨틱 컬러

| 용도 | 색상 | Mantine | 사용처 |
|------|------|---------|--------|
| **Success** | 초록 | `green` | 완료, 정답, 학습 완료 |
| **Danger** | 빨강 | `red` | 오류, 삭제, 오답 |
| **Warning** | 노랑 | `yellow` | 주의, 경고 |
| **Info** | 파랑 | `blue` | 정보, 링크, 안내 |

## 접근성 명암비 기준 (WCAG 2.1 AA) **[DO]**

| 텍스트 조건 | 필요 명암비 |
|-----------|-----------|
| 본문 텍스트 (< 18px Regular) | **4.5:1** 이상 |
| 큰 텍스트 (≥ 18px Regular 또는 ≥ 14px Bold) | **3:1** 이상 |
| UI 구성요소 구분 (보더, 아이콘) | **3:1** 이상 |

## 다크모드 규칙

| 요소 | Light | Dark |
|------|-------|------|
| 배경 | white (`#ffffff`) | `dark.7` (`#242424`) |
| 텍스트 | `brand.6` (`#1a1a1a`) | `dark.0` (`#C9C9C9`) |
| 보더 | `--mantine-color-default-border` | 동일 변수 (자동 전환) |
| 그림자 | `rgba(0,0,0, 0.04~0.08)` | `rgba(255,255,255, 0.03~0.06)` |
| hover | `--mantine-color-default-hover` | 동일 변수 |
