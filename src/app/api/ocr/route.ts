import { NextRequest, NextResponse } from 'next/server';

function detectImageType(text: string): 'timetable' | 'receipt' | 'document' | 'general' {
  if (/[월화수목금토일]/.test(text) && /\d{1,2}:\d{2}/.test(text)) return 'timetable';
  if (/합계|총액|결제|카드|현금|영수증/.test(text)) return 'receipt';
  if (/제\d+조|제\d+장|목차|서론|결론/.test(text)) return 'document';
  return 'general';
}

export async function POST(req: NextRequest) {
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      '이 이미지의 모든 텍스트를 추출해주세요. 표 구조가 있다면 구조를 유지해주세요. 줄바꿈을 활용해 가독성 있게 정리해주세요.',
      { inlineData: { data: base64, mimeType: file.type } },
    ]);

    const text = result.response.text();
    const imageType = detectImageType(text);

    return NextResponse.json({ text, imageType });
  } catch (e) {
    console.error('[OCR] Gemini Vision failed:', e);
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 });
  }
}
