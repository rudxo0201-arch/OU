import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function detectImageType(text: string): 'timetable' | 'receipt' | 'document' | 'general' {
  if (/[월화수목금토일]/.test(text) && /\d{1,2}:\d{2}/.test(text)) return 'timetable';
  if (/합계|총액|결제|카드|현금|영수증/.test(text)) return 'receipt';
  if (/제\d+조|제\d+장|목차|서론|결론/.test(text)) return 'document';
  return 'general';
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Not an image' }, { status: 400 });
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'OCR not configured' }, { status: 503 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const PROMPT = `이 이미지에서 텍스트와 내용을 모두 추출해주세요.
- 시간표/달력: 날짜, 시간, 과목/일정명을 표 형식으로
- 영수증: 항목, 금액, 합계를 목록으로
- 일반 문서: 단락 구조 유지
- 표가 있으면 마크다운 테이블로 변환
- 한국어, 영어 모두 인식
- 텍스트가 없는 사진/일러스트라면 이미지에 보이는 것을 간략히 설명`;

    // gemini-2.0-flash → gemini-1.5-flash → gemini-1.5-pro 순서로 시도
    let text = '';
    for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          PROMPT,
          { inlineData: { data: base64, mimeType: file.type } },
        ]);
        text = result.response.text().trim();
        if (text) break;
      } catch (modelErr) {
        console.warn(`[OCR] ${modelName} failed:`, (modelErr as Error).message);
      }
    }

    if (!text) {
      return NextResponse.json({ error: '이미지에서 텍스트를 인식하지 못했어요.' }, { status: 422 });
    }

    const imageType = detectImageType(text);
    return NextResponse.json({ text, imageType });
  } catch (e) {
    const msg = (e as Error).message || 'OCR failed';
    console.error('[OCR] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
