import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractDomainData } from '@/lib/pipeline/extract-domain-data';
import { extractAll } from '@/lib/pipeline/extraction';

export const maxDuration = 30;

const TIME_PATTERN = /오전|오후|내일|모레|다음주|이번주|월요일|화요일|수요일|목요일|금요일|토요일|일요일|\d{1,2}월\s*\d{1,2}일|\d{1,2}시/;

export async function DELETE(req: NextRequest) {
  try {
    const nodeId = req.nextUrl.searchParams.get('nodeId');
    if (!nodeId) return NextResponse.json({ error: 'missing nodeId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    await supabase
      .from('data_nodes')
      .update({ system_tags: ['archived'] })
      .eq('id', nodeId)
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Quick/DELETE] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, domainHint, context } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });

    const raw = text.trim();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Phase 1: regex로 즉시 파싱 → DB insert → 응답
    const domain = domainHint ?? (TIME_PATTERN.test(raw) ? 'schedule' : 'note');
    const regexData = extractDomainData(raw, domain);
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

    const admin = createAdminClient();
    const { data: node, error } = user
      ? await admin.from('data_nodes').insert({
          user_id: user.id,
          domain,
          raw,
          source_type: 'quick',
          confidence: 'medium',
          resolution: 'resolved',
          visibility: 'private',
          domain_data: { ...(context ?? {}), ...regexData },
        }).select('id, domain_data').single()
      : { data: null, error: null };

    if (error) {
      console.error('[Quick] insert error:', error);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }

    // Phase 2: LLM으로 domain_data 보정 (백그라운드, 같은 레코드 update)
    if (node?.id && user) {
      extractAll(raw, domain, today)
        .then(result => {
          if (result.confidence === 'low') return;
          return admin.from('data_nodes').update({
            domain_data: { ...(context ?? {}), ...result.domain_data },
            confidence: result.confidence,
          }).eq('id', node.id);
        })
        .catch(e => console.error('[Quick/enrich] failed:', e));
    }

    const dd = node?.domain_data as Record<string, unknown> | undefined;
    return NextResponse.json({
      ok: true,
      nodeId: node?.id ?? null,
      domain,
      title: (dd?.title ?? dd?.what ?? dd?.text ?? null) as string | null,
      subjectName: domain === 'care' ? (dd?.subject_name ?? null) : null,
    });
  } catch (e) {
    console.error('[Quick] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
