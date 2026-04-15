import { createClient } from '@/lib/supabase/server';
import { uploadToR2 } from '@/lib/storage/r2';
import type { ParsedPDF, ParsedImage } from './file-parser';

// --- 기존 API (비-PDF 파일용, 변경 없음) ---

interface SaveNodeFromFileInput {
  userId: string;
  filename: string;
  fileType: string;
  r2Key: string;
  sections: Array<{ heading: string; body: string }>;
}

export async function saveNodeFromFile(input: SaveNodeFromFileInput) {
  const supabase = await createClient();

  const fileTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
    'text/plain': 'text',
    'text/markdown': 'text',
    'text/csv': 'csv',
  };

  const sourceFileType = fileTypeMap[input.fileType] ?? 'unknown';

  // extracted_text를 domain_data에 저장 (PDFView 폴백용)
  const extractedText = input.sections.map(s => {
    const heading = s.heading ? `${s.heading}\n` : '';
    return heading + s.body;
  }).join('\n\n');

  const { data: node } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    domain: 'knowledge',
    source_type: 'upload',
    source_file_url: input.r2Key,
    source_file_type: sourceFileType,
    raw: input.filename,
    domain_data: {
      extracted_text: extractedText || null,
    },
    confidence: 'medium',
    resolution: input.sections.length > 0 ? 'resolved' : 'opaque',
    visibility: 'private',
  }).select().single();

  if (!node || input.sections.length === 0) return node;

  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i];
    const { data: sec } = await supabase.from('sections').insert({
      node_id: node.id,
      heading: section.heading,
      order_idx: i,
    }).select().single();

    if (!sec) continue;

    const sentences = section.body
      .split(/(?<=[.!?])\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 5);

    for (let j = 0; j < sentences.length; j++) {
      await supabase.from('sentences').insert({
        section_id: sec.id,
        node_id: node.id,
        text: sentences[j],
        order_idx: j,
        embed_status: 'pending',
        embed_tier: 'hot',
      });
    }
  }

  return node;
}

// --- 새 API: PDF 전용 (풍부한 메타데이터 포함) ---

interface SaveNodeFromPDFInput {
  userId: string;
  filename: string;
  r2Key: string;
  parsed: ParsedPDF | null;
}

export async function saveNodeFromPDF(input: SaveNodeFromPDFInput) {
  const supabase = await createClient();
  const { parsed } = input;

  // extracted_text 생성 (PDFView 폴백용)
  const extractedText = parsed
    ? parsed.sections.map(s => {
        const heading = s.heading ? `${s.heading}\n` : '';
        return heading + s.body;
      }).join('\n\n')
    : null;

  const hasSections = parsed && parsed.sections.length > 0;

  const { data: node } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    domain: 'knowledge',
    source_type: 'upload',
    source_file_url: input.r2Key,
    source_file_type: 'pdf',
    raw: input.filename,
    domain_data: {
      extracted_text: extractedText,
      total_pages: parsed?.totalPages || null,
      page_labels: parsed?.pageLabels || null,
      pdf_reviewed: hasSections ? false : null,  // 검토 알림용 플래그
    },
    confidence: parsed?.confidence || 'low',
    resolution: hasSections ? 'resolved' : 'opaque',
    visibility: 'private',
  }).select().single();

  if (!node || !parsed || !hasSections) return node;

  // sections + sentences 저장 (문서 전체 기준 order_idx)
  let globalSentenceIdx = 0;

  for (let i = 0; i < parsed.sections.length; i++) {
    const section = parsed.sections[i];
    const { data: sec } = await supabase.from('sections').insert({
      node_id: node.id,
      heading: section.heading,
      order_idx: i,
    }).select().single();

    if (!sec) continue;

    // file-parser에서 이미 분할된 sentences 사용
    for (const sent of section.sentences) {
      await supabase.from('sentences').insert({
        section_id: sec.id,
        node_id: node.id,
        text: sent.text,
        order_idx: globalSentenceIdx++,
        embed_status: 'pending',
        embed_tier: 'hot',
      });
    }

    // 이 section에 속하는 이미지 저장
    if (parsed.images.length > 0) {
      const sectionImages = findImagesForSection(parsed.images, section.pages);
      for (const img of sectionImages) {
        try {
          // R2에 이미지 업로드
          const imgKey = `${input.userId}/nodes/${node.id}/img-${img.orderInDocument}.png`;
          await uploadToR2(imgKey, img.buffer, 'image/png');

          await supabase.from('section_images').insert({
            section_id: sec.id,
            node_id: node.id,
            image_url: imgKey,
            order_idx: globalSentenceIdx++,  // sentences와 공유하는 순서
            caption: img.caption,
            source_type: img.sourceType,
            source_location: {
              page: img.page,
              ...img.position,
            },
          });
        } catch (e) {
          console.error(`[layer2-file] 이미지 저장 실패 (img-${img.orderInDocument}):`, e);
        }
      }
    }
  }

  return node;
}

function findImagesForSection(images: ParsedImage[], sectionPages: number[]): ParsedImage[] {
  return images.filter(img => sectionPages.includes(img.page));
}
