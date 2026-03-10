import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import { asaas } from '@/lib/billing/asaas';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event, subscription, status } = body;
        const asaasCustomerId = body.payment?.customer;
        const externalReference = body.payment?.externalReference || body.subscription?.externalReference;

        console.log('[Asaas Webhook]', event, subscription, asaasCustomerId, externalReference);

        const pool = getPool();

        // 1. Check if it's a payment confirmation
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || status === 'RECEIVED' || status === 'CONFIRMED') {

            // Try to find the tenant by externalReference (tenantId we sent when creating the payment)
            let tenantRes = await pool.query(
                "SELECT id, name FROM tenants WHERE id = $1 OR asaas_customer_id = $2 OR asaas_subscription_id = $3 LIMIT 1",
                [externalReference, asaasCustomerId, subscription || body.payment?.subscription]
            );

            let tenant = tenantRes.rows[0];

            // Fallback: If not found, try by email from Asaas
            if (!tenant && asaasCustomerId) {
                try {
                    const asaasCustomer = await asaas.getCustomer(asaasCustomerId);
                    if (asaasCustomer?.email) {
                        tenantRes = await pool.query(
                            `SELECT t.id, t.name 
                             FROM tenants t
                             JOIN users u ON u.tenant_id = t.id
                             WHERE u.email = $1 AND u.role = 'Admin'
                             LIMIT 1`,
                            [asaasCustomer.email.toLowerCase()]
                        );
                        tenant = tenantRes.rows[0];
                    }
                } catch (e) {
                    console.error('[Asaas Webhook] Error fetching customer from Asaas', e);
                }
            }

            const tenantName = tenant?.name || 'Empresa Desconhecida';
            const tenantId = tenant?.id;

            if (tenantId) {
                // Update based on tenant ID
                await pool.query(
                    `UPDATE tenants 
                     SET subscription_status = 'ACTIVE', 
                         subscription_expires_at = NOW() + INTERVAL '32 days',
                         asaas_customer_id = $1,
                         asaas_subscription_id = COALESCE($2, asaas_subscription_id)
                     WHERE id = $3`,
                    [asaasCustomerId, subscription || body.payment?.subscription || null, tenantId]
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
