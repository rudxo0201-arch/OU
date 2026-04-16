/**
 * DOCX 파서
 * mammoth.js로 Word 문서 텍스트 + HTML 추출
 */

export interface DOCXParseResult {
  sections: Array<{
    heading: string;
    body: string;
  }>;
  html?: string;
}

export async function parseDOCX(
  buffer: Buffer,
  _filename: string
): Promise<DOCXParseResult> {
  try {
    const mammoth = await import('mammoth');

    // HTML 변환 (뷰어용)
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = htmlResult.value;

    // 텍스트 추출 (구조화용)
    const textResult = await mammoth.extractRawText({ buffer });
    const fullText = textResult.value;

    if (!fullText.trim()) {
      return {
        sections: [{
          heading: '문서',
          body: '텍스트를 추출할 수 없었어요.',
        }],
        html,
      };
    }

    // 빈 줄 2개 이상으로 단락 분리
    const paragraphs = fullText.split(/\n{2,}/).filter(p => p.trim());
    const sections: DOCXParseResult['sections'] = [];

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      sections.push({
        heading: trimmed.split('\n')[0].slice(0, 60),
        body: trimmed,
      });
    }

    if (sections.length === 0) {
      sections.push({
        heading: fullText.slice(0, 60),
        body: fullText,
      });
    }

    return { sections, html };
  } catch (e) {
    console.error('[DOCX Parser] failed:', e);
    return {
      sections: [{
        heading: '파싱 실패',
        body: 'DOCX 파일을 읽을 수 없었어요.',
      }],
    };
  }
}
