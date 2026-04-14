# 타이포그래피

> KRDS 참조: Pretendard 기본, rem 단위, 1.5배 줄간격

## 글꼴 (Typeface)

| 용도 | 폰트 | 비고 |
|------|------|------|
| **본문** | Pretendard Variable | 한국어 최적화, system fallback |
| **로고** | Orbitron | Google Fonts, `--font-logo` |
| **코드** | 시스템 모노스페이스 | `monospace` |

```css
font-family: "Pretendard Variable", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
```

## 타입 스케일

> 기준: `html { font-size: 62.5% }` → `1rem = 10px` (KRDS 권장)
> 실제 Mantine은 16px 기준이므로 px로 정의하고 Mantine에서 변환

| 스타일 | 사이즈 | 웨이트 | 줄간격 | 용도 |
|--------|--------|--------|--------|------|
| **Display** | 32px | Bold (700) | 1.3 | 랜딩 타이틀, 히어로 |
| **H1** | 28px | Bold (700) | 1.3 | 페이지 제목 |
| **H2** | 24px | SemiBold (600) | 1.4 | 섹션 제목 |
| **H3** | 20px | SemiBold (600) | 1.4 | 서브 섹션 |
| **Body LG** | 16px | Regular (400) | 1.5 | 본문 (큰) |
| **Body** | 14px | Regular (400) | 1.5 | 본문 (기본) |
| **Caption** | 12px | Regular (400) | 1.5 | 보조 텍스트, 라벨 |
| **Tiny** | 11px | Regular (400) | 1.5 | 배지, 태그, 메타 |

## 웨이트

> KRDS 권장: Regular + Bold 2가지만 사용

| 웨이트 | 값 | 용도 |
|--------|---|------|
| **Regular** | 400 | 본문, 설명, 라벨 |
| **Medium** | 500 | 버튼 텍스트, 강조 라벨 |
| **SemiBold** | 600 | 제목 (H2, H3) |
| **Bold** | 700 | 대제목 (Display, H1), 강조 |

## 줄간격 (Line Height) **[DO]**

> "가독성을 위해 폰트 사이즈의 1.5배를 권장" (KRDS)

| 스타일 | 줄간격 비율 |
|--------|-----------|
| Display, H1 | 1.3 |
| H2, H3 | 1.4 |
| Body, Caption, Tiny | **1.5** (기본) |

## 자간 (Letter Spacing)

| 스타일 | 자간 |
|--------|------|
| Display, H1 | -0.02em (타이트) |
| H2, H3 | -0.01em |
| Body 이하 | 0 (기본) |

## 위계 규칙 **[DO]**

```
한 화면에 Display는 최대 1개
H1은 페이지당 1개 (페이지 제목)
H2는 섹션 구분에 사용
Body는 본문의 기본
강조는 Bold로 (색상 변경보다 우선)
```
