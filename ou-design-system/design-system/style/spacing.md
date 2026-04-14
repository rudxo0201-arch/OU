# 간격 & 그리드

> KRDS 참조: 8-Point Grid, 12/8/4 컬럼, 반응형 브레이크포인트

## 간격 시스템 (8-Point Grid) **[DO]**

> 기본 단위: 8px의 배수. 예외적으로 4px 배수 허용.

| 토큰 | 값 | 용도 |
|------|---|------|
| `space-1` | 4px | 아이콘-텍스트 간격, 미세 조정 |
| `space-2` | 8px | 인라인 요소 간격, 칩 패딩 |
| `space-3` | 12px | 카드 내부 패딩 (소) |
| `space-4` | 16px | 카드 내부 패딩 (기본), 모바일 마진 |
| `space-5` | 20px | 섹션 내 간격 |
| `space-6` | 24px | PC 마진, 컴포넌트 간격 |
| `space-8` | 32px | 섹션 간격 |
| `space-10` | 40px | 대섹션 간격 |
| `space-12` | 48px | 페이지 상단 여백 |
| `space-16` | 64px | 히어로/랜딩 여백 |

## 스크린 마진 **[DO]**

| 디바이스 | 최소 마진 |
|---------|----------|
| Mobile (< 768px) | 16px |
| Desktop (≥ 768px) | 24px |

## 그리드 시스템

### 컬럼 구성

| 디바이스 | 기본 컬럼 | 최대 컬럼 | 거터 |
|---------|----------|----------|------|
| Desktop (≥ 1024px) | 12 | 16 | 24px |
| Tablet (768~1023px) | 8 | 12 | 16px |
| Mobile (< 768px) | 4 | 6 | 16px |

### 콘텐츠 영역

| 항목 | 값 |
|------|---|
| 최대 너비 | **1280px** |
| 컬럼 너비 | 백분율 (유동) |
| 거터 | 고정 px |

## 반응형 브레이크포인트

> PostCSS에 정의된 변수와 대응

| 이름 | 값 | PostCSS 변수 |
|------|---|-------------|
| xs | 576px | `$mantine-breakpoint-xs: 36em` |
| sm | 768px | `$mantine-breakpoint-sm: 48em` |
| md | 992px | `$mantine-breakpoint-md: 62em` |
| lg | 1200px | `$mantine-breakpoint-lg: 75em` |
| xl | 1408px | `$mantine-breakpoint-xl: 88em` |

## 반응형 전환 규칙 **[DO]**

| 전환 | 조건 | 동작 |
|------|------|------|
| Sidebar → Bottom Tab | ≤ 768px | 사이드바 숨김, 바텀탭 표시 |
| Side Panel → Bottom Sheet | ≤ 768px | 85vh 바텀시트로 전환 |
| 12컬럼 → 4컬럼 | ≤ 768px | 그리드 재배치 |
| 팝업 → 중앙 모달 | ≤ 768px | 모바일 최적화 |

## 레이아웃 구조

```
Desktop:
┌─ Sidebar (60px/220px) ─┬─ Main Content (max 1280px) ─┐
│                        │ PageHeader                    │
│ Navigation             │ Content Area                  │
│                        │   + Side Panel (320px)        │
│                        ├─ Footer ─────────────────────┘

Mobile:
┌─ Main Content (100%) ─────────────────────┐
│ Content Area                               │
│   + Bottom Sheet (85vh)                    │
├─ Bottom Tab (56px) ───────────────────────┘
```
