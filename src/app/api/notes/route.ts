import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notes — 사용자의 노트 목록 (페이지 트리용)
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('data_nodes')
      .select('id, domain_data, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('domain', 'note')
      .or('system_tags.is.null,system_tags.not.cs.{"archived"}')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Notes/GET]', error.message);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (e) {
    console.error('[Notes/GET] unexpected:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notes — 새 노트 생성
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { title?: string; parent_page_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body OK
    }

    const { title = '', parent_page_id = null } = body;

    const { data, error } = await supabase
      .from('data_nodes')
      .insert({
        user_id: user.id,
        domain: 'note',
        source_type: 'manual',
        raw: title,
        domain_data: {
          title,
          parent_page_id,
          blocks: { type: 'doc', content: [{ type: 'paragraph' }] },
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Notes/POST]', error.message);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) {
    console.error('[Notes/POST] unexpected:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
