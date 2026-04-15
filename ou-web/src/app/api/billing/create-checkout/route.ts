import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { plan?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { plan } = body;

    if (!plan || typeof plan !== 'string') {
      return NextResponse.json({ error: 'plan is required' }, { status: 400 });
    }

    const PRICE_IDS: Record<string, string> = {
      pro:  process.env.STRIPE_PRICE_PRO ?? '',
      team: process.env.STRIPE_PRICE_TEAM ?? '',
    };

    const priceId = PRICE_IDS[plan];
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/upgrade`,
      customer_email: user.email,
      metadata: { userId: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[CreateCheckout] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
