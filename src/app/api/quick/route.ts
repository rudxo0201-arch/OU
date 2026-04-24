import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveMessageAsync } from '@/lib/pipeline/layer2';

export const maxDuration = 30;

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
    if (!text?.trim()) {
      return NextResponse.json({ error: 'empty' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const result = await saveMessageAsync({
      userId: user?.id,
      userMessage: text.trim(),
      assistantMessage: '',
      ...(domainHint ? { domainHint } : {}),
      ...(context ? { context } : {}),
    });

    const dd = result?.node?.domain_data as Record<string, unknown> | undefined;
    return NextResponse.json({
      ok: true,
      nodeId: result?.node?.id ?? null,
      domain: result?.domain ?? null,
      title: (dd?.title ?? dd?.what ?? dd?.text ?? null) as string | null,
      subjectName: result?.domain === 'care' ? (dd?.subject_name ?? null) : null,
    });
  } catch (e) {
    console.error('[Quick] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
