import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { runAgent } from '@/lib/agents/pipeline';

/**
 * POST /api/admin/agents/run
 *
 * 단일 에이전트를 실행한다.
 * Body: { agentId: string, input: any }
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { agentId, input } = body;

    if (!agentId || input === undefined) {
      return NextResponse.json(
        { error: 'agentId and input are required' },
        { status: 400 },
      );
    }

    const { result, tokens } = await runAgent(agentId, input);

    return NextResponse.json({
      success: true,
      agentId,
      result,
      tokens,
    });
  } catch (e: any) {
    console.error('[Admin/Agents/Run] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
