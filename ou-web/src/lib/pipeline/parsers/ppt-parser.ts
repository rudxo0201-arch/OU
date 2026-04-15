/**
 * PPT/PPTX 파서 (준비 중)
 *
 * 향후 구현 시:
 * - .pptx → 슬라이드별 텍스트 추출
 * - 이미지 슬라이드는 OCR 연계
 * - 각 슬라이드를 section으로 매핑
 */

export interface PPTParseResult {
  slides: Array<{
    index: number;
    heading: string;
    body: string;
  }>;
}

export async function parsePPT(
  _buffer: Buffer,
  _filename: string
): Promise<PPTParseResult> {
  // TODO: pptx 라이브러리 연동 후 구현
  return {
    slides: [
      {
        index: 0,
        heading: '안내',
        body: 'PPT 파싱은 준비 중이에요',
      },
    ],
  };
}

/** 지원 여부 확인 */
export function isPPTSupported(): boolean {
  return false;
}
