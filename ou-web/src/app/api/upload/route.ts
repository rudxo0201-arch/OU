import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, buildR2Key } from '@/lib/storage/r2';
import { parseFile, parsePDFFull } from '@/lib/pipeline/file-parser';
import { saveNodeFromFile, saveNodeFromPDF } from '@/lib/pipeline/layer2-file';

// 50MB limit
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const r2Key = buildR2Key(user.id, file.name);
    await uploadToR2(r2Key, buffer, file.type);

    // PDF는 새 파이프라인 사용
    if (file.type === 'application/pdf') {
      let parsedPDF;
      try {
        parsedPDF = await parsePDFFull(buffer, file.name);
      } catch (e) {
        console.error('[upload] PDF 파싱 실패, 원본만 저장:', e);
      }

      const node = await saveNodeFromPDF({
        userId: user.id,
        filename: file.name,
        r2Key,
        parsed: parsedPDF || null,
      });

      return NextResponse.json({ success: true, nodeId: node?.id, r2Key });
    }

    // 비-PDF 파일은 기존 파이프라인
    let parsedSections: Array<{ heading: string; body: string }> = [];
    try {
      parsedSections = await parseFile(buffer, file.type, file.name);
    } catch (e) {
      console.error('[upload] 파싱 실패, 원본만 저장:', e);
    }

    const node = await saveNodeFromFile({
      userId: user.id,
      filename: file.name,
      fileType: file.type,
      r2Key,
      sections: parsedSections,
    });

    return NextResponse.json({ success: true, nodeId: node?.id, r2Key });
  } catch (e) {
    console.error('[Upload] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
