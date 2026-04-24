/**
 * POST /api/quick/image
 *
 * preview: 이미지 → R2 보존 + OCR → 텍스트 반환 (DB 저장 없음)
 * confirm: OCR 텍스트 → saveMessageAsync → 기존 파이프라인이 도메인 분류/추출
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, buildR2Key } from '@/lib/storage/r2';
import { saveMessageAsync } from '@/lib/pipeline/layer2';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

async function runOCR(buffer: Buffer, mimeType: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error('OCR not configured');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const base64 = buffer.toString('base64');

  const PROMPT = `이 이미지에서 텍스트와 내용을 빠짐없이 추출해주세요.
- 표/시간표: 날짜, 시간, 항목명을 구조를 유지하며 텍스트로
- 영수증: 항목, 금액, 합계
- 일반 문서: 단락 구조 유지
- 한국어, 영어 모두 인식`;

  for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        PROMPT,
        { inlineData: { data: base64, mimeType } },
      ]);
      const text = result.response.text().trim();
      if (text) return text;
    } catch (e) {
      console.warn(`[quick/image] ${modelName} failed:`, (e as Error).message);
    }
  }
  throw new Error('이미지에서 텍스트를 인식하지 못했어요.');
}

async function handlePreview(req: NextRequest, userId: string): Promise<NextResponse> {
  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Not an image' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 원본 이미지 R2 보존
  const ext = file.name.split('.').pop() ?? 'jpg';
  const r2Key = buildR2Key(userId, `quick-image.${ext}`);
  await uploadToR2(r2Key, buffer, file.type);

  let ocrText: string;
  try { ocrText = await runOCR(buffer, file.type); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 422 }); }

  return NextResponse.json({ imageUrl: r2Key, ocrText });
}

async function handleConfirm(req: NextRequest, userId: string): Promise<NextResponse> {
  const { ocrText } = await req.json() as { ocrText: string };
  if (!ocrText?.trim()) return NextResponse.json({ error: 'No text' }, { status: 400 });

  const result = await saveMessageAsync({
    userId,
    userMessage: ocrText.trim(),
    assistantMessage: '',
  });

  const dd = result?.node?.domain_data as Record<string, unknown> | undefined;
  return NextResponse.json({
    ok: true,
    nodeId: result?.node?.id ?? null,
    domain: result?.domain ?? null,
    title: (dd?.title ?? dd?.what ?? null) as string | null,
    totalCreated: result?.node ? 1 : 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const confirm = req.nextUrl.searchParams.get('confirm') === 'true';
    return confirm ? handleConfirm(req, user.id) : handlePreview(req, user.id);
  } catch (e) {
    console.error('[quick/image] error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
