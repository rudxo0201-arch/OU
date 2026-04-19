import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_DAILY_THRESHOLD_USD = 10;

/**
 * Cost Alert Cron
 *
 * Checks today's total API cost from api_cost_log.
 * If it exceeds the threshold, logs an alert.
 * Future: send email/push notification.
 */
export async function POST(req: NextRequest) {
  // Auth: verify cron secret or admin user
  const authHeader = req.headers.get('authorization');
  const supabase = await createClient();

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Parse optional threshold from query params
  const url = new URL(req.url);
  const thresholdParam = url.searchParams.get('threshold');
  const threshold = thresholdParam
    ? parseFloat(thresholdParam)
    : DEFAULT_DAILY_THRESHOLD_USD;

  try {
    // Get today's start (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Sum today's costs
    const { data: costRows } = await supabase
      .from('api_cost_log')
      .select('cost_usd, operation, model')
      .gte('created_at', todayStart.toISOString());

    const totalCost =
      costRows?.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0) ?? 0;

    // Breakdown by operation
    const operationBreakdown: Record<string, number> = {};
    const modelBreakdown: Record<string, number> = {};
    let callCount = 0;

    for (const row of costRows ?? []) {
      callCount++;
      operationBreakdown[row.operation] =
        (operationBreakdown[row.operation] ?? 0) + (row.cost_usd ?? 0);
      modelBreakdown[row.model] =
        (modelBreakdown[row.model] ?? 0) + (row.cost_usd ?? 0);
    }

    const isOverThreshold = totalCost > threshold;

    const result = {
      date: todayStart.toISOString().split('T')[0],
      totalCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000,
      thresholdUsd: threshold,
      isOverThreshold,
      callCount,
      operationBreakdown,
      modelBreakdown,
    };

    if (isOverThreshold) {
      console.warn(
        `[CostAlert] Daily cost $${totalCost.toFixed(4)} exceeds threshold $${threshold}`,
      );

      // Log the alert to api_cost_log as a meta-entry
      await supabase.from('api_cost_log').insert({
        operation: 'cost_alert',
        model: 'system',
        tokens: 0,
        cost_usd: 0,
        node_id: null,
        user_id: null,
      });

      // Future: send notification
      // await sendAdminNotification({
      //   type: 'cost_alert',
      //   message: `Daily API cost ($${totalCost.toFixed(2)}) exceeded threshold ($${threshold})`,
      //   data: result,
      // });
    }

    return NextResponse.json({ success: true, alert: isOverThreshold, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CostAlert] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

/**
 * GET handler for simple health check / status query.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: costRows } = await supabase
    .from('api_cost_log')
    .select('cost_usd')
    .gte('created_at', todayStart.toISOString());

  const totalCost =
    costRows?.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0) ?? 0;

  return NextResponse.json({
    date: todayStart.toISOString().split('T')[0],
    totalCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000,
    thresholdUsd: DEFAULT_DAILY_THRESHOLD_USD,
    isOverThreshold: totalCost > DEFAULT_DAILY_THRESHOLD_USD,
  });
}
