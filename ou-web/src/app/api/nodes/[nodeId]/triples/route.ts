import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const nodeId = params.nodeId;

    // Verify the node belongs to the user
    const { data: node } = await supabase
      .from('data_nodes')
      .select('user_id')
      .eq('id', nodeId)
      .single();

    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (node.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: triples, error } = await supabase
      .from('triples')
      .select('id, subject, predicate, object, confidence, source_type, created_at')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[Triples/GET] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to load triples' }, { status: 500 });
    }

    return NextResponse.json({ triples: triples ?? [] });
  } catch (e) {
    console.error('[Triples/GET] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
