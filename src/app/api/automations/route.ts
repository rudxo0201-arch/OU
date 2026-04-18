import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { automationToDomainData } from '@/lib/automation';

/**
 * GET /api/automations — 회원의 자동화 목록 조회
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('data_nodes')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', 'automation')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ automations: data ?? [] });
  } catch (e) {
    console.error('[Automations/GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/automations — 새 자동화 생성
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { name: string; trigger: unknown; actions: unknown[]; enabled?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.name || !body.trigger || !body.actions?.length) {
      return NextResponse.json({ error: 'name, trigger, actions are required' }, { status: 400 });
    }

    const domainData = automationToDomainData({
      name: body.name,
      trigger: body.trigger as any,
      actions: body.actions as any[],
      enabled: body.enabled ?? true,
    });

    const { data, error } = await supabase
      .from('data_nodes')
      .insert({
        user_id: user.id,
        title: body.name,
        domain: 'automation',
        raw: `자동화: ${body.name}`,
        domain_data: domainData,
        tags: ['automation'],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ automation: data }, { status: 201 });
  } catch (e) {
    console.error('[Automations/POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
