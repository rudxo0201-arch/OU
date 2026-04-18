/**
 * HWPX 파서
 * ZIP(XML 기반) 한컴 문서 텍스트 추출
 */
import JSZip from 'jszip';

export interface HWPXParseResult {
  sections: Array<{
    heading: string;
    body: string;
  }>;
}

/**
 * HWPX 파일에서 텍스트를 추출한다.
 * HWPX = ZIP 안에 Contents/section0.xml, section1.xml... 형태의 XML
 */
export async function parseHWPX(
  buffer: Buffer,
  _filename: string
): Promise<HWPXParseResult> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const sections: HWPXParseResult['sections'] = [];

    // Contents/section*.xml 파일들을 순서대로 처리
    const sectionFiles = Object.keys(zip.files)
      .filter(name => /^Contents\/section\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/section(\d+)/)?.[1] ?? '0');
        const numB = parseInt(b.match(/section(\d+)/)?.[1] ?? '0');
        return numA - numB;
      });

    for (const fileName of sectionFiles) {
      const xml = await zip.files[fileName].async('text');
      const texts = extractTextsFromHWPXML(xml);

      if (texts.length > 0) {
        const fullText = texts.join('\n');
        const paragraphs = fullText.split(/\n{2,}/);

        for (const para of paragraphs) {
          const trimmed = para.trim();
          if (!trimmed) continue;
          sections.push({
            heading: trimmed.slice(0, 60),
            body: trimmed,
          });
        }
      }
    }

    // section 파일이 없으면 다른 XML에서 시도
    if (sections.length === 0) {
      const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));
      for (const fileName of xmlFiles) {
        const xml = await zip.files[fileName].async('text');
        const texts = extractTextsFromHWPXML(xml);
        if (texts.length > 0) {
          sections.push({
            heading: texts[0].slice(0, 60),
            body: texts.join('\n'),
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
    console.error('[HWPX Parser] failed:', e);
    return {
      sections: [{
        heading: '파싱 실패',
        body: 'HWPX 파일을 읽을 수 없었어요.',
      }],
    };
  }
}

/**
 * HWPX XML에서 <hp:t> 또는 <t> 태그의 텍스트를 추출한다.
 * 정규식 기반 — DOM 파서 없이 가볍게 처리.
 */
function extractTextsFromHWPXML(xml: string): string[] {
  const texts: string[] = [];

  // <hp:t>, <hp:t xml:space="preserve">, <t> 태그 매칭
  const tagPattern = /<(?:hp:)?t[^>]*>([\s\S]*?)<\/(?:hp:)?t>/g;
  let match;
  let currentLine = '';

  while ((match = tagPattern.exec(xml)) !== null) {
    const text = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    currentLine += text;
  }

  // 줄바꿈 기준: <hp:p> 또는 <p> 태그 경계
  const paraPattern = /<(?:hp:)?p[^>]*>([\s\S]*?)<\/(?:hp:)?p>/g;
  let paraMatch;

  while ((paraMatch = paraPattern.exec(xml)) !== null) {
    const paraXml = paraMatch[1];
    const paraTexts: string[] = [];
    const innerTagPattern = /<(?:hp:)?t[^>]*>([\s\S]*?)<\/(?:hp:)?t>/g;
    let innerMatch;

    while ((innerMatch = innerTagPattern.exec(paraXml)) !== null) {
      const t = innerMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      if (t) paraTexts.push(t);
    }

    if (paraTexts.length > 0) {
      texts.push(paraTexts.join(''));
    }
  }

  // <p> 태그가 없으면 전체에서 <t> 추출
  if (texts.length === 0 && currentLine.trim()) {
    texts.push(currentLine.trim());
  }

  return texts;
}
