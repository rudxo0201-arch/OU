// 폰트 페어링 시스템
// 흑백 제약에서 타이포그래피가 핵심 차별화 요소

export const FONT_PAIRS = {
  academic: {
    heading: '"Noto Serif KR", serif',
    body: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    caption: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
  },
  magazine: {
    heading: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    body: '"Noto Serif KR", serif',
    caption: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
  },
  report: {
    heading: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    body: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    caption: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
  },
  textbook: {
    heading: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    body: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    caption: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
  },
  minimal: {
    heading: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    body: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
    caption: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
  },
  literary: {
    heading: '"Noto Serif KR", serif',
    body: '"Noto Serif KR", serif',
    caption: '"Pretendard Variable", "Pretendard", -apple-system, sans-serif',
  },
} as const;

// Noto Serif KR 웹폰트 로딩 (Google Fonts)
// weights: 400(Regular), 600(SemiBold), 700(Bold)
export const NOTO_SERIF_KR_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap';

let fontLoaded = false;

export function loadNotoSerifKR(): void {
  if (fontLoaded || typeof document === 'undefined') return;
  fontLoaded = true;

  const existing = document.querySelector(`link[href*="Noto+Serif+KR"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = NOTO_SERIF_KR_URL;
  document.head.appendChild(link);
}
