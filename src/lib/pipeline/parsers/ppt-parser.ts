/**
 * PPT/PPTX 파서
 * pptx-parser로 슬라이드별 텍스트 추출
 */

export interface PPTParseResult {
  slides: Array<{
    index: number;
    heading: string;
    body: string;
  }>;
}

export async function parsePPT(
  buffer: Buffer,
  _filename: string
): Promise<PPTParseResult> {
  try {
    const pptxParser = await import('pptx-parser') as any;
    const parse = pptxParser.default ?? pptxParser;
    const result = await parse(buffer);

    const slides: PPTParseResult['slides'] = [];

    if (Array.isArray(result)) {
      for (let i = 0; i < result.length; i++) {
        const slide = result[i];
        const texts: string[] = [];

        if (Array.isArray(slide)) {
          for (const item of slide) {
            if (typeof item === 'string' && item.trim()) {
              texts.push(item.trim());
            } else if (item?.text && typeof item.text === 'string') {
              texts.push(item.text.trim());
            }
          }
        } else if (slide?.text) {
          texts.push(String(slide.text).trim());
        }

        if (texts.length > 0) {
          slides.push({
            index: i,
            heading: texts[0].slice(0, 60),
            body: texts.join('\n'),
          });
        }
      }
    }

    if (slides.length === 0) {
      return {
        slides: [{
          index: 0,
          heading: '슬라이드',
          body: '텍스트를 추출할 수 없었어요. 이미지 위주 PPT일 수 있어요.',
        }],
      };
    }

    return { slides };
  } catch (e) {
    console.error('[PPT Parser] failed:', e);
    return {
      slides: [{
        index: 0,
        heading: '파싱 실패',
        body: 'PPT 파일을 읽을 수 없었어요.',
      }],
    };
  }
}

export function isPPTSupported(): boolean {
  return true;
}
