import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { parentNodeId?: string; content?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { parentNodeId, content } = body;

    if (!parentNodeId || !content) {
      return NextResponse.json(
        { error: 'parentNodeId and content are required' },
        { status: 400 }
      );
    }

    // Create comment as a DataNode
    const { data: commentNode, error: nodeError } = await supabase
      .from('data_nodes')
      .insert({
        user_id: user.id,
        domain: 'knowledge',
        source_type: 'manual',
        title: content.slice(0, 100),
        raw: content,
        visibility: 'public',
        confidence: 'high',
        resolution: 'resolved',
      })
      .select('id')
      .single();

    if (nodeError || !commentNode) {
      console.error('[Comment] Failed to create comment node:', nodeError?.message);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Link comment to parent via node_relations
    const { error: relationError } = await supabase
      .from('node_relations')
      .insert({
        source_node_id: commentNode.id,
        target_node_id: parentNodeId,
        relation_type: 'comment_on',
      });

    if (relationError) {
      console.error('[Comment] Failed to create relation:', relationError.message);
      return NextResponse.json({ error: 'Failed to link comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, commentId: commentNode.id });
  } catch (e) {
    console.error('[Comment] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
