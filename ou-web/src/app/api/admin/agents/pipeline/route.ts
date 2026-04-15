import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { runScenarioPipeline } from '@/lib/agents/pipeline';
import type { PipelineStage } from '@/lib/agents/pipeline';

const VALID_STAGES: PipelineStage[] = ['analyze', 'plan', 'spec', 'implement', 'qa'];

/**
 * POST /api/admin/agents/pipeline
 *
 * 시나리오 파이프라인을 실행한다.
 * Body: { scenarioText: string, scenarioId?: string, stopAfter?: PipelineStage }
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { scenarioText, scenarioId, stopAfter } = body;

    if (!scenarioText || typeof scenarioText !== 'string') {
      return NextResponse.json(
        { error: 'scenarioText is required' },
        { status: 400 },
      );
    }

    if (stopAfter && !VALID_STAGES.includes(stopAfter)) {
      return NextResponse.json(
        { error: `Invalid stopAfter. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 },
      );
    }

    const result = await runScenarioPipeline(scenarioText, {
      scenarioId,
      stopAfter: stopAfter as PipelineStage | undefined,
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[Admin/Agents/Pipeline] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
