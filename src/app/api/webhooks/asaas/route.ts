import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event, subscription, status } = body;

        console.log('[Asaas Webhook]', event, subscription);

        const pool = getPool();

        // 1. Check if it's a payment confirmation
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || status === 'RECEIVED' || status === 'CONFIRMED') {
            if (subscription) {
                // Update based on subscription ID
                await pool.query(
                    "UPDATE tenants SET subscription_status = 'ACTIVE', subscription_expires_at = NOW() + INTERVAL '32 days' WHERE asaas_subscription_id = $1",
                    [subscription]
                );
            } else if (body.payment?.subscription) {
                await pool.query(
                    "UPDATE tenants SET subscription_status = 'ACTIVE', subscription_expires_at = NOW() + INTERVAL '32 days' WHERE asaas_subscription_id = $1",
                    [body.payment.subscription]
                );
            }
        }

        // 2. Handle cancellation
        if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_DISABLED') {
            await pool.query(
                "UPDATE tenants SET subscription_status = 'CANCELED' WHERE asaas_subscription_id = $1",
                [subscription]
            );
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('[Asaas Webhook Error]', err);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
