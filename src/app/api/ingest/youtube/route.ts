import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractVideoId, parseYouTubeVideo } from '@/lib/pipeline/parsers/youtube-parser';
import { saveYouTubeNode } from '@/lib/pipeline/layer2-youtube';

/**
 * POST /api/ingest/youtube
 *
 * YouTube URL → 자막 수집 + STT 검수 + DataNode 생성
 * 응답에 transcript 포함 → 클라이언트 즉시 렌더링
 *
 * Body: { url: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { url } = body as { url: string };

  if (!url) {
    return NextResponse.json({ error: 'url 필수' }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: 'YouTube URL을 인식하지 못했어요' }, { status: 400 });
  }

  try {
    // 파싱: 자막 + 메타데이터 + STT 검수 + 댓글
    const parsed = await parseYouTubeVideo(videoId);

    if (!parsed) {
      return NextResponse.json({ error: '영상 정보를 가져올 수 없어요' }, { status: 500 });
    }

    // DataNode 저장 (중복 체크 포함)
    const result = await saveYouTubeNode({
      userId: user.id,
      parsed,
    });

    if (!result) {
      return NextResponse.json({ error: '데이터 저장에 실패했어요' }, { status: 500 });
    }

    // 클라이언트가 즉시 렌더링할 수 있도록 transcript + metadata 포함
    return NextResponse.json({
      nodeId: result.nodeId,
      domain: result.domain,
      viewHint: result.viewHint,
      metadata: {
        title: parsed.metadata.title,
        channelName: parsed.metadata.channelName,
        thumbnailUrl: parsed.metadata.thumbnailUrl,
        duration: parsed.metadata.duration,
        chapters: parsed.metadata.chapters,
      },
      transcript: parsed.transcript.map(s => ({
        text: s.text,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      transcriptCorrected: parsed.transcriptCorrected,
      commentDigest: parsed.commentDigest,
    });
  } catch (err) {
    console.error('[ingest/youtube] error:', err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
