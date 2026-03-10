import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event, subscription, status } = body;

        console.log('[Asaas Webhook]', event, subscription);

        const pool = getPool();

        // 1. Check if it's a payment confirmation
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || status === 'RECEIVED' || status === 'CONFIRMED') {
            const tenantRes = await pool.query(
                "SELECT name FROM tenants WHERE asaas_subscription_id = $1 OR asaas_customer_id = $2 LIMIT 1",
                [subscription, body.payment?.customer]
            );
            const tenantName = tenantRes.rows[0]?.name || 'Empresa Desconhecida';

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

            await sendTelegramMessage(`💰 *Pagamento Confirmado!*\nA empresa *${tenantName}* efetuou o pagamento.`);
        }

        // 2. Handle cancellation
        if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_DISABLED') {
            const tenantRes = await pool.query(
                "SELECT name FROM tenants WHERE asaas_subscription_id = $1 LIMIT 1",
                [subscription]
            );
            const tenantName = tenantRes.rows[0]?.name || 'Empresa Desconhecida';

            await pool.query(
                "UPDATE tenants SET subscription_status = 'CANCELED' WHERE asaas_subscription_id = $1",
                [subscription]
            );

            await sendTelegramMessage(`🚨 *Assinatura Cancelada!*\nA empresa *${tenantName}* cancelou ou desativou a assinatura.`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('[Asaas Webhook Error]', err);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
}
