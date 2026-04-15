// ============================================================
// PDF 데이터화 엔진 — Phase 1
// ============================================================
// 핵심 원칙:
//   - order_idx는 문서 전체 기준 (페이지 기준 아님)
//   - 하나의 문장이 두 개의 order_idx로 쪼개지면 안 됨
//   - 이미지: 장식 버림, 데이터 이미지만 DB화
//   - 깨진 PDF는 버리지 않고 보정

// --- 타입 정의 ---

export interface ParsedSentence {
  text: string;
  pages: number[];
  type?: 'body' | 'footnote';
}

export interface ParsedSection {
  heading: string;
  body: string;
  pages: number[];
  headingLevel?: number;
  sentences: ParsedSentence[];
}

export interface ParsedImage {
  buffer: Buffer;
  page: number;
  position: { x: number; y: number; width: number; height: number };
  caption: string | null;
  sourceType: 'embedded' | 'captured';
  orderInDocument: number;
}

export interface ParsedPDF {
  sections: ParsedSection[];
  images: ParsedImage[];
  totalPages: number;
  pageLabels: Array<{ pageIndex: number; label: string }>;
  confidence: 'high' | 'medium' | 'low';
}

interface PageText {
  pageIndex: number;
  text: string;
  startIdx: number;
  endIdx: number;
  items: TextItem[];
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

interface OutlineItem {
  title: string;
  pageIndex: number;
  level: number;
}

// 기존 호환용 타입
interface LegacySection {
  heading: string;
  body: string;
}

// --- 메인 엔트리 ---

export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<LegacySection[]> {
  if (mimeType === 'application/pdf') {
    const result = await parsePDFAdvanced(buffer, filename);
    // 하위 호환: sections를 기존 형식으로도 반환
    return result.sections.map(s => ({ heading: s.heading, body: s.body }));
  }

  if (mimeType.startsWith('image/')) {
    return parseImageOCR(buffer, mimeType);
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return parseText(buffer.toString('utf-8'));
  }

  if (mimeType === 'text/csv') {
    return parseCSV(buffer.toString('utf-8'));
  }

  return [];
}

/** 새 API: 풍부한 메타데이터 포함 PDF 파싱 */
export async function parsePDFFull(
  buffer: Buffer,
  filename: string
): Promise<ParsedPDF> {
  return parsePDFAdvanced(buffer, filename);
}

// --- PDF 파싱 엔진 ---

async function parsePDFAdvanced(buffer: Buffer, filename: string): Promise<ParsedPDF> {
  const pdfjs = await importPdfjs();
  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data: uint8, useSystemFonts: true }).promise;
  const totalPages = doc.numPages;

  // Step 1: 페이지별 텍스트 + 메타데이터 추출
  const pageTexts: PageText[] = [];
  let globalCharIdx = 0;

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    const items: TextItem[] = content.items
      .filter((item: any) => item.str && item.str.trim())
      .map((item: any) => ({
        text: item.str as string,
        x: item.transform[4] as number,
        y: pageHeight - (item.transform[5] as number),  // PDF y좌표는 하단 기준 → 상단 기준으로 변환
        width: item.width as number,
        height: item.height as number,
        fontSize: Math.abs(item.transform[0]) as number, // scale factor ≈ fontSize
        fontName: (item.fontName || '') as string,
      }));

    // 텍스트 아이템을 y좌표(위→아래), x좌표(왼→오른) 순서로 정렬
    items.sort((a, b) => a.y - b.y || a.x - b.x);

    const pageText = items.map(it => it.text).join(' ');
    const startIdx = globalCharIdx;
    globalCharIdx += pageText.length + 1; // +1 for page separator

    pageTexts.push({
      pageIndex: i,
      text: pageText,
      startIdx,
      endIdx: globalCharIdx - 1,
      items,
    });
  }

  // Step 1.5: 쪽번호 + 러닝헤더 분리
  const { cleanedPages, pageLabels } = separatePageNumbersAndHeaders(pageTexts);

  // Step 2: 헤더 감지 (목차 우선)
  let outlineItems: OutlineItem[] = [];
  try {
    const outline = await doc.getOutline();
    if (outline && outline.length > 0) {
      outlineItems = await extractOutlineItems(doc, outline, 1);
    }
  } catch {
    // outline 없으면 폰트 기반 폴백
  }

  // Step 0: 품질 진단
  const confidence = assessQuality(cleanedPages, totalPages);

  // confidence가 low면 여기서 Gemini Vision OCR로 재추출할 수 있으나,
  // 비동기 Layer 3에서 처리하는 것이 더 적합 (서버 응답 시간)
  // → confidence를 반환하여 layer2에서 판단

  // Step 3: 전체 텍스트 스트림으로 병합 (페이지 경계에서 문장 자르지 않음)
  const { mergedText, pageBoundaryMap } = mergePageTexts(cleanedPages, outlineItems);

  // Step 4: section/sentence 분할
  const sections = splitIntoSections(mergedText, pageBoundaryMap, outlineItems, cleanedPages);

  // 이미지 추출 (Phase 1 — 규칙 필터링까지만, Gemini Vision은 Layer 3)
  const images = await extractImages(doc, pageTexts, totalPages);

  await doc.destroy();

  return {
    sections,
    images,
    totalPages,
    pageLabels,
    confidence,
  };
}

// --- Step 1.5: 쪽번호/러닝헤더 분리 ---

function separatePageNumbersAndHeaders(pages: PageText[]): {
  cleanedPages: PageText[];
  pageLabels: Array<{ pageIndex: number; label: string }>;
} {
  const pageLabels: Array<{ pageIndex: number; label: string }> = [];

  // 러닝헤더 감지: 모든 페이지에서 비슷한 y좌표에 반복되는 텍스트
  const topTexts = new Map<string, number>();
  const bottomTexts = new Map<string, number>();

  for (const page of pages) {
    if (page.items.length === 0) continue;
    const pageHeight = Math.max(...page.items.map(it => it.y + it.height));

    // 상단 10% 영역
    const topItems = page.items.filter(it => it.y < pageHeight * 0.1);
    for (const item of topItems) {
      const key = item.text.trim();
      if (key) topTexts.set(key, (topTexts.get(key) || 0) + 1);
    }

    // 하단 10% 영역
    const bottomItems = page.items.filter(it => it.y > pageHeight * 0.9);
    for (const item of bottomItems) {
      const key = item.text.trim();
      if (key) bottomTexts.set(key, (bottomTexts.get(key) || 0) + 1);
    }
  }

  // 전체 페이지의 50% 이상에서 반복되는 텍스트 = 러닝헤더
  const threshold = Math.max(2, pages.length * 0.5);
  const headerTexts = new Set<string>();
  topTexts.forEach((count, text) => {
    if (count >= threshold) headerTexts.add(text);
  });
  bottomTexts.forEach((count, text) => {
    if (count >= threshold) headerTexts.add(text);
  });

  // 쪽번호 패턴
  const pageNumPatterns = [
    /^\d{1,4}$/,              // "35"
    /^-\s*\d{1,4}\s*-$/,     // "- 35 -"
    /^p\.?\s*\d{1,4}$/i,     // "p.35"
    /^page\s*\d{1,4}$/i,     // "page 35"
  ];

  const cleanedPages: PageText[] = pages.map(page => {
    if (page.items.length === 0) return page;
    const pageHeight = Math.max(...page.items.map(it => it.y + it.height));

    const filteredItems = page.items.filter(item => {
      const text = item.text.trim();

      // 러닝헤더 제거
      if (headerTexts.has(text)) return false;

      // 쪽번호 제거 (상단/하단 10% 영역에서만)
      if (item.y < pageHeight * 0.1 || item.y > pageHeight * 0.9) {
        for (const pattern of pageNumPatterns) {
          if (pattern.test(text)) {
            pageLabels.push({ pageIndex: page.pageIndex, label: text.replace(/[-p.page\s]/gi, '') });
            return false;
          }
        }
      }

      return true;
    });

    const cleanText = filteredItems.map(it => it.text).join(' ');
    return {
      ...page,
      text: cleanText,
      items: filteredItems,
    };
  });

  return { cleanedPages, pageLabels };
}

// --- Step 2: Outline 추출 ---

async function extractOutlineItems(
  doc: any,
  items: any[],
  level: number
): Promise<OutlineItem[]> {
  const result: OutlineItem[] = [];

  for (const item of items) {
    let pageIndex = 1;
    if (item.dest) {
      try {
        const dest = typeof item.dest === 'string'
          ? await doc.getDestination(item.dest)
          : item.dest;
        if (dest && dest[0]) {
          const pageRef = dest[0];
          pageIndex = await doc.getPageIndex(pageRef) + 1;
        }
      } catch {
        // 페이지 참조 실패 → 기본값 유지
      }
    }

    result.push({
      title: item.title || '',
      pageIndex,
      level,
    });

    if (item.items && item.items.length > 0) {
      const children = await extractOutlineItems(doc, item.items, level + 1);
      result.push(...children);
    }
  }

  return result;
}

// --- Step 0: 품질 진단 ---

function assessQuality(pages: PageText[], totalPages: number): 'high' | 'medium' | 'low' {
  const allText = pages.map(p => p.text).join(' ');
  if (!allText || allText.length < 10) return 'low';

  // 의미없는 유니코드 비율 (Private Use Area, replacement chars 등)
  const totalChars = allText.length;
  const garbageChars = (allText.match(/[\uE000-\uF8FF\uFFFD\u0000-\u001F]/g) || []).length;
  const garbageRatio = garbageChars / totalChars;

  // 한글/영문/숫자/공백 비율
  const meaningfulChars = (allText.match(/[\uAC00-\uD7A3a-zA-Z0-9\s.,!?。]/g) || []).length;
  const meaningfulRatio = meaningfulChars / totalChars;

  // 텍스트 양 vs 페이지 수 (페이지당 평균 100자 미만이면 의심)
  const charsPerPage = totalChars / totalPages;

  if (garbageRatio > 0.3 || meaningfulRatio < 0.5 || charsPerPage < 50) {
    return 'low';
  }
  if (garbageRatio > 0.1 || meaningfulRatio < 0.7 || charsPerPage < 100) {
    return 'medium';
  }
  return 'high';
}

// --- Step 3: 페이지 간 텍스트 병합 ---

interface PageBoundary {
  pageIndex: number;
  startIdx: number;
  endIdx: number;
}

function mergePageTexts(
  pages: PageText[],
  outlineItems: OutlineItem[]
): { mergedText: string; pageBoundaryMap: PageBoundary[] } {
  const pageBoundaryMap: PageBoundary[] = [];
  let merged = '';

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageText = page.text.trim();
    if (!pageText) continue;

    const startIdx = merged.length;

    // 다음 페이지가 헤더로 시작하는지 확인 (Case A)
    const nextPage = pages[i + 1];
    const nextIsHeader = nextPage && isHeaderStart(nextPage, outlineItems);

    if (merged.length > 0) {
      const lastChar = merged[merged.length - 1];
      const endsWithTerminator = /[.!?。\n]/.test(lastChar);

      if (nextIsHeader || endsWithTerminator) {
        // Case A or B: 자연 분리 또는 헤더 시작
        merged += '\n';
      } else {
        // Case C: 문장 중간 끊김 → 이어붙임
        merged += ' ';
      }
    }

    const actualStartIdx = merged.length;
    merged += pageText;

    pageBoundaryMap.push({
      pageIndex: page.pageIndex,
      startIdx: actualStartIdx,
      endIdx: merged.length,
    });
  }

  return { mergedText: merged, pageBoundaryMap };
}

function isHeaderStart(page: PageText, outlineItems: OutlineItem[]): boolean {
  // outline에 이 페이지에서 시작하는 헤더가 있으면
  if (outlineItems.some(o => o.pageIndex === page.pageIndex)) {
    return true;
  }

  // 폰트 크기 기반 폴백: 첫 텍스트 아이템의 fontSize가 나머지보다 크면
  if (page.items.length < 2) return false;
  const firstItem = page.items[0];
  const restAvgSize = page.items.slice(1).reduce((sum, it) => sum + it.fontSize, 0) / (page.items.length - 1);
  if (firstItem.fontSize > restAvgSize * 1.3) return true;

  // 패턴 기반
  const firstText = firstItem.text.trim();
  if (/^(제\s*\d+\s*(장|절|항|편)|chapter\s+\d+|\d+\.\s+\S)/i.test(firstText)) {
    return true;
  }

  return false;
}

// --- Step 4: Section/Sentence 분할 ---

function splitIntoSections(
  mergedText: string,
  pageBoundaryMap: PageBoundary[],
  outlineItems: OutlineItem[],
  pages: PageText[]
): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // outline 기반 분할이 우선
  if (outlineItems.length > 0) {
    // outline 아이템을 mergedText 내 위치로 매핑
    const outlinePositions = mapOutlineToTextPositions(outlineItems, pageBoundaryMap, mergedText);

    for (let i = 0; i < outlinePositions.length; i++) {
      const current = outlinePositions[i];
      const next = outlinePositions[i + 1];
      const sectionText = next
        ? mergedText.slice(current.textIdx, next.textIdx).trim()
        : mergedText.slice(current.textIdx).trim();

      if (!sectionText) continue;

      // heading을 본문에서 제거
      let body = sectionText;
      if (body.startsWith(current.title)) {
        body = body.slice(current.title.length).trim();
      }

      const sentences = splitSentences(body, current.textIdx + (sectionText.length - body.length), pageBoundaryMap);
      const sectionPages = getPagesForRange(current.textIdx, current.textIdx + sectionText.length, pageBoundaryMap);

      sections.push({
        heading: current.title,
        body,
        pages: sectionPages,
        headingLevel: current.level,
        sentences,
      });
    }
  } else {
    // outline 없으면 \n{2,} 기반 분할 (기존 로직 개선)
    const paragraphs = mergedText.split(/\n{2,}/);
    let textOffset = 0;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length < 10) {
        textOffset += para.length + 2; // +2 for \n\n
        continue;
      }

      // 헤더 패턴 감지 (폰트 정보 없으므로 텍스트 패턴만)
      let heading = '';
      let body = trimmed;
      const headerMatch = trimmed.match(/^(제\s*\d+\s*(장|절|항|편).*|chapter\s+\d+.*|\d+\.\s+\S.*)/i);
      if (headerMatch) {
        // 첫 줄을 heading으로 분리
        const newlineIdx = trimmed.indexOf('\n');
        if (newlineIdx > 0) {
          heading = trimmed.slice(0, newlineIdx).trim();
          body = trimmed.slice(newlineIdx + 1).trim();
        } else {
          heading = trimmed;
          body = '';
        }
      }

      const paraStartInMerged = mergedText.indexOf(trimmed, textOffset);
      const actualStart = paraStartInMerged >= 0 ? paraStartInMerged : textOffset;

      const sentences = splitSentences(body || trimmed, actualStart, pageBoundaryMap);
      const sectionPages = getPagesForRange(actualStart, actualStart + trimmed.length, pageBoundaryMap);

      sections.push({
        heading: heading || `섹션 ${sections.length + 1}`,
        body: body || trimmed,
        pages: sectionPages,
        sentences,
      });

      textOffset = actualStart + trimmed.length;
    }
  }

  // 빈 sections 제거
  return sections.filter(s => s.body.length > 0 || s.sentences.length > 0);
}

function mapOutlineToTextPositions(
  outlineItems: OutlineItem[],
  pageBoundaryMap: PageBoundary[],
  mergedText: string
): Array<{ title: string; textIdx: number; level: number }> {
  const results: Array<{ title: string; textIdx: number; level: number }> = [];

  for (const item of outlineItems) {
    // outline의 pageIndex에 해당하는 pageBoundary 찾기
    const boundary = pageBoundaryMap.find(b => b.pageIndex === item.pageIndex);
    if (!boundary) continue;

    // 해당 페이지 시작점 근처에서 제목 텍스트 찾기
    const searchStart = boundary.startIdx;
    const searchEnd = Math.min(boundary.endIdx, boundary.startIdx + 500);
    const searchArea = mergedText.slice(searchStart, searchEnd);

    const titleIdx = searchArea.indexOf(item.title);
    const textIdx = titleIdx >= 0 ? searchStart + titleIdx : searchStart;

    results.push({ title: item.title, textIdx, level: item.level });
  }

  // 위치 순으로 정렬
  results.sort((a, b) => a.textIdx - b.textIdx);
  return results;
}

// --- Step 4.5: Sentence 분할 ---

function splitSentences(
  text: string,
  textStartInMerged: number,
  pageBoundaryMap: PageBoundary[]
): ParsedSentence[] {
  if (!text || text.trim().length < 5) return [];

  // 문장 종결 패턴으로 분할
  const rawSentences = text
    .split(/(?<=[.!?。])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const sentences: ParsedSentence[] = [];
  let offset = 0;

  for (const sent of rawSentences) {
    const sentStart = text.indexOf(sent, offset);
    const actualStart = sentStart >= 0 ? sentStart : offset;
    const globalStart = textStartInMerged + actualStart;
    const globalEnd = globalStart + sent.length;

    const pages = getPagesForRange(globalStart, globalEnd, pageBoundaryMap);

    sentences.push({
      text: sent,
      pages,
      type: 'body',
    });

    offset = actualStart + sent.length;
  }

  return sentences;
}

// --- Step 5: 페이지 역매핑 ---

function getPagesForRange(startIdx: number, endIdx: number, boundaries: PageBoundary[]): number[] {
  const pages: number[] = [];
  for (const b of boundaries) {
    if (b.endIdx > startIdx && b.startIdx < endIdx) {
      pages.push(b.pageIndex);
    }
  }
  return pages.length > 0 ? pages : [1];
}

// --- 이미지 추출 (Phase 1: 규칙 필터링) ---

async function extractImages(
  doc: any,
  pageTexts: PageText[],
  totalPages: number
): Promise<ParsedImage[]> {
  const images: ParsedImage[] = [];
  const imageHashes = new Map<string, number>(); // hash → 출현 횟수
  let orderInDocument = 0;

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const ops = await page.getOperatorList();
    const viewport = page.getViewport({ scale: 1.0 });

    for (let j = 0; j < ops.fnArray.length; j++) {
      // OPS.paintImageXObject = 85
      if (ops.fnArray[j] !== 85) continue;

      const imgName = ops.argsArray[j]?.[0];
      if (!imgName) continue;

      try {
        const imgData = await page.objs.get(imgName);
        if (!imgData || !imgData.data) continue;

        const width = imgData.width;
        const height = imgData.height;

        // 규칙 기반 장식 필터
        // 1. 50x50px 미만 → 아이콘/불릿
        if (width < 50 || height < 50) continue;

        // 2. 극단적 비율 → 구분선/장식 바
        const ratio = Math.max(width, height) / Math.min(width, height);
        if (ratio > 10) continue;

        // 3. 페이지 전체 크기 → 배경
        if (width > viewport.width * 0.95 && height > viewport.height * 0.95) continue;

        // 4. 이미지 해시로 반복 감지 (간이 해시: 크기+첫/마지막 바이트)
        const hashKey = `${width}x${height}-${imgData.data[0]}-${imgData.data[imgData.data.length - 1]}`;
        const count = (imageHashes.get(hashKey) || 0) + 1;
        imageHashes.set(hashKey, count);
        if (count > 2) continue; // 3회 이상 반복 → 로고/워터마크

        // 이미지 데이터를 RGBA → PNG Buffer로 변환
        const pngBuffer = rgbaToRawBuffer(imgData.data, width, height);

        // 캡션 매칭
        const caption = findCaption(pageTexts[i - 1], imgData, viewport);

        images.push({
          buffer: pngBuffer,
          page: i,
          position: {
            x: 0, y: 0,  // 정확한 위치는 transform matrix에서 추출해야 하지만 간소화
            width, height,
          },
          caption,
          sourceType: 'embedded',
          orderInDocument: orderInDocument++,
        });
      } catch {
        // 이미지 추출 실패는 무시 (원본 PDF는 R2에 보존됨)
        continue;
      }
    }
  }

  return images;
}

function rgbaToRawBuffer(data: Uint8Array | Uint8ClampedArray, width: number, height: number): Buffer {
  // pdfjs의 이미지 데이터는 RGBA raw 형식
  // Sharp 등으로 PNG 변환은 layer2에서 처리
  // 여기서는 raw 바이너리만 전달
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

function findCaption(pageText: PageText | undefined, imgData: any, viewport: any): string | null {
  if (!pageText) return null;

  // 이미지 아래쪽 영역의 텍스트에서 캡션 패턴 탐지
  const captionPatterns = [
    /^(그림|fig(?:ure)?|표|table|사진|도표|차트|chart)\s*\.?\s*\d+/i,
    /^\[?(그림|fig(?:ure)?|표|table)\s*\d+\]?/i,
  ];

  for (const item of pageText.items) {
    const text = item.text.trim();
    for (const pattern of captionPatterns) {
      if (pattern.test(text)) {
        return text;
      }
    }
  }

  return null;
}

// --- pdfjs-dist 서버사이드 임포트 ---

async function importPdfjs() {
  // pdfjs-dist legacy 빌드: Node.js 환경에서 canvas 없이 동작
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs;
}

// --- 기존 비-PDF 파서 (변경 없음) ---

async function parseImageOCR(buffer: Buffer, mimeType: string) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const base64 = buffer.toString('base64');
  const result = await model.generateContent([
    '이 이미지의 텍스트를 추출해줘. 구조를 유지하고 한국어로.',
    { inlineData: { data: base64, mimeType } },
  ]);

  const text = result.response.text();
  return [{ heading: '이미지 텍스트', body: text }];
}

function parseText(text: string) {
  const lines = text.split('\n');
  const sections: Array<{ heading: string; body: string }> = [];
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n') });
      }
      currentHeading = line.replace(/^#+\s*/, '');
      currentBody = [];
    } else if (line.trim()) {
      currentBody.push(line);
    }
  }
  if (currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n') });
  }
  return sections;
}

function parseCSV(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0]?.split(',') ?? [];
  return lines.slice(1).map((line, i) => ({
    heading: `행 ${i + 1}`,
    body: line.split(',').map((v, j) => `${headers[j]}: ${v}`).join(', '),
  }));
}
