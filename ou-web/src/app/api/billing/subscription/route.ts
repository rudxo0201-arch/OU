import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * GET /api/billing/subscription
 * 현재 구독 상태 조회
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status, token_limit, current_period_end, cancelled_at')
      .eq('user_id', user.id)
      .single();

    if (!sub) {
      return NextResponse.json({
        plan: 'free',
        status: 'active',
        tokenLimit: 50,
        periodEnd: null,
        cancelledAt: null,
      });
    }

    return NextResponse.json({
      plan: sub.plan,
      status: sub.status,
      tokenLimit: sub.token_limit,
      periodEnd: sub.current_period_end,
      cancelledAt: sub.cancelled_at,
    });
  } catch (e) {
    console.error('[Subscription] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/billing/subscription
 * 구독 해지 (기간 종료 시 해지)
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 기간 종료 시 해지 (즉시 해지가 아님)
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await supabase
      .from('subscriptions')
      .update({
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[CancelSubscription] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
