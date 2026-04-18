import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nodeToAutomation, runAutomation } from '@/lib/automation';
import type { AutomationContext } from '@/lib/automation';

/**
 * POST /api/automations/[id]/run — 자동화 수동 실행
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the automation
    const { data: node } = await supabase
      .from('data_nodes')
      .select('*')
      .eq('id', id)
      .eq('domain', 'automation')
      .single();

    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (node.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const automation = nodeToAutomation(node);
    if (!automation) {
      return NextResponse.json({ error: 'Invalid automation data' }, { status: 400 });
    }

    // Build context from request body (optional node/message)
    let body: { node?: AutomationContext['node']; message?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine for manual trigger
    }

    const context: AutomationContext = {
      node: body.node,
      message: body.message,
      userId: user.id,
    };

    const result = await runAutomation(automation, context, supabase);

    return NextResponse.json(result);
  } catch (e) {
    console.error('[Automations/Run]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
