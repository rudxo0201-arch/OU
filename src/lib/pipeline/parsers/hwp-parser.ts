/**
 * HWP/HWPX 파서
 * hwp.js로 한컴 문서 텍스트 추출
 */

export interface HWPParseResult {
  sections: Array<{
    heading: string;
    body: string;
  }>;
}

export async function parseHWP(
  buffer: Buffer,
  _filename: string
): Promise<HWPParseResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const HWP = await import('hwp.js') as any;
    const parser = HWP.default ?? HWP;
    const hwpDocument = typeof parser === 'function' ? parser(buffer) : parser.parse?.(buffer) ?? null;

    const sections: HWPParseResult['sections'] = [];

    if (hwpDocument?.sections) {
      for (const section of hwpDocument.sections) {
        const texts: string[] = [];

        if (Array.isArray(section.paragraphs)) {
          for (const para of section.paragraphs) {
            const text = typeof para === 'string' ? para : para?.text ?? '';
            if (text.trim()) texts.push(text.trim());
          }
        } else if (typeof section === 'string') {
          texts.push(section.trim());
        }

        if (texts.length > 0) {
          sections.push({
            heading: texts[0].slice(0, 60),
            body: texts.join('\n'),
          });
        }
      }
    }

    // hwp.js가 텍스트만 반환하는 경우
    if (sections.length === 0 && typeof hwpDocument === 'string' && hwpDocument.trim()) {
      const paragraphs = hwpDocument.split(/\n{2,}/);
      for (const para of paragraphs) {
        if (para.trim()) {
          sections.push({
            heading: para.trim().slice(0, 60),
            body: para.trim(),
          });
        }
      }
    }

    if (sections.length === 0) {
      return {
        sections: [{
          heading: '문서',
          body: '텍스트를 추출할 수 없었어요.',
        }],
      };
    }

    return { sections };
  } catch (e) {
    console.error('[HWP Parser] failed:', e);
    return {
      sections: [{
        heading: '파싱 실패',
        body: 'HWP 파일을 읽을 수 없었어요.',
      }],
    };
  }
}

export function isHWPSupported(): boolean {
  return true;
}
