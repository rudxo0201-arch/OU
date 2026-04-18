import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * POST /api/billing/portal
 * Stripe Customer Portal 세션 생성 (결제수단 변경, 인보이스 확인, 해지)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    // 사용자의 Stripe customer ID 조회
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[BillingPortal] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
