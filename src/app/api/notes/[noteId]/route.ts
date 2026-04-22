import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { noteId: string } },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: note, error } = await supabase
      .from('data_nodes')
      .select('id, domain, domain_data, raw, created_at, updated_at')
      .eq('id', params.noteId)
      .eq('user_id', user.id)
      .eq('domain', 'note')
      .single();

    if (error || !note) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (e) {
    console.error('[notes/[noteId] GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
