/**
 * HWP/HWPX 파서 (준비 중)
 *
 * 향후 구현 시:
 * - .hwp → 한컴 문서 텍스트 추출
 * - .hwpx → XML 기반 파싱
 * - 표/이미지 등 구조 추출
 */

export interface HWPParseResult {
  sections: Array<{
    heading: string;
    body: string;
  }>;
}

export async function parseHWP(
  _buffer: Buffer,
  _filename: string
): Promise<HWPParseResult> {
  // TODO: hwp.js 등 라이브러리 연동 후 구현
  return {
    sections: [
      {
        heading: '안내',
        body: 'HWP 파싱은 준비 중이에요',
      },
    ],
  };
}

/** 지원 여부 확인 */
export function isHWPSupported(): boolean {
  return false;
}
