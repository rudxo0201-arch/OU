import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  });
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Webhook] Signature verification failed:', message);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const supabase = await createClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });
        }

        const plan = session.metadata?.plan || 'pro';
        const tokenLimit = plan === 'pro' ? 100000 : plan === 'enterprise' ? 1000000 : 10000;

        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan,
            token_limit: tokenLimit,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any; // Stripe.Subscription
        const customerId = (subscription.customer as string);

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (existingSub) {
          const status = subscription.cancel_at_period_end ? 'cancelled' : 'active';
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          await supabase
            .from('subscriptions')
            .update({
              status,
              current_period_end: periodEnd,
              cancelled_at: subscription.cancel_at_period_end
                ? new Date().toISOString()
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', existingSub.user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (existingSub) {
          await supabase
            .from('subscriptions')
            .update({
              plan: 'free',
              token_limit: 10000,
              status: 'expired',
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', existingSub.user_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any; // Stripe.Invoice
        const customerId = invoice.customer as string;

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (existingSub) {
          // 결제 실패 시 상태만 변경 (즉시 다운그레이드는 안 함)
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', existingSub.user_id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('[Webhook] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
