import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractAll } from '@/lib/pipeline/extraction';
import { classifyDomain } from '@/lib/pipeline/classifier';

export const maxDuration = 30;

/**
 * /api/quick — QSBar inbox 엔드포인트.
 *
 * 역할: 도메인이 불명확한 빠른 입력을 즉시 DB로 받아내고, 분류·파싱은
 * 백그라운드 LLM에 맡긴다 (CLAUDE.md §7). 정규식은 쓰지 않는다 (§11, D-001).
 *
 * 즉시 응답:
 *   - domainHint가 있으면 그 도메인으로 INSERT
 *   - 없으면 'unresolved'로 INSERT
 *   - 즉시 응답에 nodeId/domain/title 반환 (title = raw 앞 50자)
 *
 * 백그라운드:
 *   - domainHint 없으면 LLM classify → domain 갱신
 *   - LLM extract → domain_data 갱신
 */
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
    const { text, domainHint, context, kind } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });

    const raw = text.trim();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const initialDomain = domainHint ?? 'unresolved';
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

    // 즉시 INSERT — raw + 최소 메타. LLM 분류·파싱은 백그라운드에서.
    const initialData: Record<string, unknown> = {
      ...(context ?? {}),
      title: raw.slice(0, 50),
      date: today,
      ...(initialDomain === 'habit' ? { kind: kind ?? 'definition' } : kind ? { kind } : {}),
    };

    const admin = createAdminClient();
    const { data: node, error } = await admin
      .from('data_nodes')
      .insert({
        user_id: user.id,
        domain: initialDomain,
        raw,
        source_type: 'quick',
        confidence: 'low',
        resolution: 'pending',
        domain_data: initialData,
      })
      .select('id, domain_data')
      .single();

    if (error) {
      console.error('[Quick] insert error:', error);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }

    // 백그라운드 보강: 1) domain 미확정이면 classify, 2) domain_data 추출
    if (node?.id) {
      enrichInBackground({
        nodeId: node.id,
        userId: user.id,
        raw,
        domain: initialDomain,
        domainHinted: !!domainHint,
        context: context ?? {},
        kind,
        today,
      }).catch(e => console.error('[Quick/enrich] failed:', e));
    }

    const dd = node?.domain_data as Record<string, unknown> | undefined;
    return NextResponse.json({
      ok: true,
      nodeId: node?.id ?? null,
      domain: initialDomain,
      title: (dd?.title ?? null) as string | null,
      subjectName: initialDomain === 'care' ? (dd?.subject_name ?? null) : null,
    });
  } catch (e) {
    console.error('[Quick] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

interface EnrichArgs {
  nodeId: string;
  userId: string;
  raw: string;
  domain: string;
  domainHinted: boolean;
  context: Record<string, unknown>;
  kind?: string;
  today: string;
}

async function enrichInBackground(args: EnrichArgs) {
  const admin = createAdminClient();
  let domain = args.domain;

  // domainHint가 없으면 LLM classify
  if (!args.domainHinted) {
    try {
      const classified = await classifyDomain(args.raw);
      if (classified.domain) {
        domain = classified.domain;
        await admin
          .from('data_nodes')
          .update({ domain, view_hint: classified.viewHint ?? null })
          .eq('id', args.nodeId);
      }
    } catch (e) {
      console.error('[Quick/classify] failed:', e);
    }
  }

  // domain extraction
  try {
    const result = await extractAll(args.raw, domain, args.today);
    if (result.confidence === 'low') return;

    await admin
      .from('data_nodes')
      .update({
        domain_data: {
          ...args.context,
          ...result.domain_data,
          ...(domain === 'habit' ? { kind: args.kind ?? 'definition' } : args.kind ? { kind: args.kind } : {}),
        },
        confidence: result.confidence,
        resolution: 'resolved',
      })
      .eq('id', args.nodeId);
  } catch (e) {
    console.error('[Quick/extract] failed:', e);
  }
}
