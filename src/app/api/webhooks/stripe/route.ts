import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import { stripeClient } from '@/lib/billing/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') || '';

    try {
        const event = await stripeClient.constructEvent(body, sig);
        const pool = getPool();

        console.log('[Stripe Webhook]', event.type);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const tenantId = session.metadata?.tenantId;
            const stripeCustomerId = session.customer as string;
            const stripeSubscriptionId = session.subscription as string;

            if (tenantId) {
                // Find tenant name for the message
                const tenantRes = await pool.query("SELECT name FROM tenants WHERE id = $1", [tenantId]);
                const tenantName = tenantRes.rows[0]?.name || 'Empresa Desconhecida';

                // Update tenant status
                await pool.query(
                    `UPDATE tenants 
                     SET subscription_status = 'ACTIVE', 
                         status = 'ACTIVE',
                         subscription_expires_at = NOW() + INTERVAL '32 days',
                         stripe_customer_id = $1,
                         stripe_subscription_id = $2
                     WHERE id = $3`,
                    [stripeCustomerId, stripeSubscriptionId, tenantId]
                );

                await sendTelegramMessage(`💳 *Pagamento Confirmado (Stripe)!*\nA empresa *${tenantName}* efetuou o pagamento.`);
            }
        }

        if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription;
            await pool.query(
                "UPDATE tenants SET subscription_status = 'CANCELED' WHERE stripe_subscription_id = $1",
                [subscription.id]
            );
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('[Stripe Webhook Error]', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
