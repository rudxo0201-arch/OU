import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { COPY } from '@/lib/copy';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: COPY.error.unauthorized }, { status: 401 });

    let body: { name?: string; viewType?: string; customCode?: string; filterConfig?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    const { name, viewType, customCode, filterConfig } = body;

    if (!name || !viewType) {
      return NextResponse.json(
        { message: COPY.error.generic },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('saved_views')
      .insert({
        user_id: user.id,
        name,
        view_type: viewType,
        custom_code: customCode || null,
        filter_config: filterConfig || null,
      })
      .select('id, name, view_type')
      .single();

    if (error) {
      console.error('[Views/POST] Supabase error:', error.message);
      return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
    }

    return NextResponse.json({ success: true, view: data });
  } catch (e) {
    console.error('[Views/POST] Unexpected error:', e);
    return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: COPY.error.unauthorized }, { status: 401 });

    const { data, error } = await supabase
      .from('saved_views')
      .select('id, name, view_type, filter_config, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Views/GET] Supabase error:', error.message);
      return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
    }

    return NextResponse.json({ views: data });
  } catch (e) {
    console.error('[Views/GET] Unexpected error:', e);
    return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: COPY.error.unauthorized }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    const { error } = await supabase
      .from('saved_views')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Views/DELETE] Supabase error:', error.message);
      return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Views/DELETE] Unexpected error:', e);
    return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: COPY.error.unauthorized }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    // 허용된 업데이트 필드만 추출
    const allowedKeys = [
      'name', 'view_type', 'icon', 'description',
      'filter_config', 'layout_config', 'schema_map', 'custom_code',
      'visibility', 'is_default', 'sort_order',
    ];

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedKeys) {
      if (key in fields) {
        updateData[key] = fields[key];
      }
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_views')
      .update(updateData)
      .eq('id', id as string)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('[Views/PATCH] Supabase error:', error.message);
      return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
    }

    return NextResponse.json({ success: true, view: data });
  } catch (e) {
    console.error('[Views/PATCH] Unexpected error:', e);
    return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
  }
}
