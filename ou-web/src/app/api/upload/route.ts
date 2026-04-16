import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, buildR2Key } from '@/lib/storage/r2';
import { parseFile, parsePDFFull } from '@/lib/pipeline/file-parser';
import { saveNodeFromFile, saveNodeFromPDF } from '@/lib/pipeline/layer2-file';

const MAX_FILE_SIZE = 50 * 1024 * 1024;       // 50MB 기본
const MAX_VIDEO_FILE_SIZE = 200 * 1024 * 1024; // 200MB 영상/음성

/** 브라우저가 부정확한 MIME을 보내는 경우 확장자로 보정 */
function resolveContentType(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    hwp: 'application/x-hwp',
    hwpx: 'application/x-hwpx',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };
  // 브라우저가 올바른 MIME을 보내면 그대로, 아니면 확장자 기반
  if (ext && extMap[ext] && (file.type === 'application/octet-stream' || !file.type)) {
    return extMap[ext];
  }
  return extMap[ext ?? ''] ?? file.type;
}

function isMediaFile(contentType: string): boolean {
  return contentType.startsWith('video/') || contentType.startsWith('audio/');
}

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

    const contentType = resolveContentType(file);
    const maxSize = isMediaFile(contentType) ? MAX_VIDEO_FILE_SIZE : MAX_FILE_SIZE;

    if (file.size > maxSize) {
      const limitMB = Math.round(maxSize / 1024 / 1024);
      return NextResponse.json({ error: `File too large (max ${limitMB}MB)` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const r2Key = buildR2Key(user.id, file.name);
    await uploadToR2(r2Key, buffer, contentType);

    // PDF는 전용 파이프라인
    if (contentType === 'application/pdf') {
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

    // PPT: slides를 extraDomainData에 보존 (뷰어용)
    const ext = file.name.split('.').pop()?.toLowerCase();
    let extraDomainData: Record<string, unknown> | undefined;

    if (ext === 'pptx' || ext === 'ppt') {
      try {
        const { parsePPT } = await import('@/lib/pipeline/parsers/ppt-parser');
        const pptResult = await parsePPT(buffer, file.name);
        extraDomainData = { slides: pptResult.slides };
      } catch (e) {
        console.error('[upload] PPT slides 추출 실패:', e);
      }
    }

    // DOCX: HTML을 extraDomainData에 보존 (뷰어용)
    if (ext === 'docx') {
      try {
        const { parseDOCX } = await import('@/lib/pipeline/parsers/docx-parser');
        const docxResult = await parseDOCX(buffer, file.name);
        if (docxResult.html) {
          extraDomainData = { docx_html: docxResult.html };
        }
      } catch (e) {
        console.error('[upload] DOCX HTML 추출 실패:', e);
      }
    }

    // XLSX: sheets를 extraDomainData에 보존 (뷰어용)
    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const { parseXLSX } = await import('@/lib/pipeline/parsers/xlsx-parser');
        const xlsxResult = await parseXLSX(buffer, file.name);
        if (xlsxResult.sheets) {
          extraDomainData = { sheets: xlsxResult.sheets };
        }
      } catch (e) {
        console.error('[upload] XLSX sheets 추출 실패:', e);
      }
    }

    // 공통 파이프라인: parseFile → saveNodeFromFile
    let parsedSections: Array<{ heading: string; body: string }> = [];
    try {
      parsedSections = await parseFile(buffer, contentType, file.name);
    } catch (e) {
      console.error('[upload] 파싱 실패, 원본만 저장:', e);
    }

    const node = await saveNodeFromFile({
      userId: user.id,
      filename: file.name,
      fileType: contentType,
      r2Key,
      sections: parsedSections,
      extraDomainData,
    });

    return NextResponse.json({ success: true, nodeId: node?.id, r2Key });
  } catch (e) {
    console.error('[Upload] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
