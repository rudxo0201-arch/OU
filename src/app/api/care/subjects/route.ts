import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('care_subjects')
      .select('id, subject_type, name, display_order, birthday')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[care/subjects GET]', error.message);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }

    return NextResponse.json({ subjects: data ?? [] });
  } catch (e) {
    console.error('[care/subjects GET]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { subject_type, name, birthday } = await req.json();
    if (!subject_type?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'subject_type and name required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('care_subjects')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (existing?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('care_subjects')
      .insert({ user_id: user.id, subject_type, name, display_order: nextOrder, birthday: birthday ?? null })
      .select('id, subject_type, name, display_order, birthday')
      .single();

    if (error) {
      console.error('[care/subjects POST]', error.message);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }

    // relation 도메인 DataNode 자동 생성 → People Orb에서 관계도로 연결됨
    try {
      const relationshipLabel = subject_type === 'child' ? '자녀'
        : subject_type === 'pet' ? '반려동물'
        : subject_type === 'elder' ? '가족'
        : '돌봄 대상';

      const adminSupabase = createAdminClient();
      void adminSupabase.from('data_nodes').insert({
        user_id: user.id,
        domain: 'relation',
        raw: `${name} (${relationshipLabel})`,
        source_type: 'app',
        confidence: 'high',
        resolution: 'resolved',
        visibility: 'private',
        domain_data: {
          name,
          relationship_to_user: relationshipLabel,
          subject_type,
          care_subject_id: data?.id,
          birthday: birthday ?? null,
        },
      });
    } catch (e) {
      console.error('[care/subjects] relation node skipped:', e);
    }

    return NextResponse.json({ subject: data });
  } catch (e) {
    console.error('[care/subjects POST]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('care_subjects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[care/subjects PATCH]', error.message);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[care/subjects PATCH]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
