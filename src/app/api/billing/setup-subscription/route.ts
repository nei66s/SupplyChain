import { NextRequest, NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { asaas } from '@/lib/billing/asaas';

export async function POST(req: NextRequest) {
    try {
        const auth = getAuthPayload(req);
        if (!auth) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

        const pool = getPool();

        // 1. Get Tenant Data
        const tenantRes = await pool.query(
            'SELECT id, name, email, asaas_customer_id, asaas_subscription_id FROM tenants WHERE id = $1',
            [auth.tenantId]
        );
        const tenant = tenantRes.rows[0];
        if (!tenant) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 });

        let customerId = tenant.asaas_customer_id;

        // 2. Create Asaas Customer if not exists
        if (!customerId) {
            const customer = await asaas.createCustomer({
                name: tenant.name,
                email: tenant.email || 'contato@' + tenant.id + '.com', // Fallback to a placeholder if tenant has no email
            });
            customerId = customer.id;
            await pool.query('UPDATE tenants SET asaas_customer_id = $1 WHERE id = $2', [customerId, tenant.id]);
        }

        // 3. Create Subscription (Monthly, R$ 300)
        // For simplicity, we choose PIX as the primary billing type for now
        const subscription = await asaas.createSubscription({
            customer: customerId,
            billingType: 'PIX',
            value: 300.00,
            nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
            cycle: 'MONTHLY',
            description: 'Plano Operação Total - Inventário Ágil',
        });

        await pool.query(
            'UPDATE tenants SET asaas_subscription_id = $1, subscription_status = $2 WHERE id = $3',
            [subscription.id, 'INCOMPLETE', tenant.id]
        );

        // 4. Return the invoice ID or URL
        // In Asaas, subscriptions generate payments. We might need to fetch the first payment for the Pix QR Code.
        return NextResponse.json({
            subscriptionId: subscription.id,
            invoiceUrl: subscription.invoiceUrl
        });

    } catch (err: any) {
        console.error('[Billing Checkout]', err);
        return NextResponse.json({ message: err.message || 'Erro ao processar pagamento' }, { status: 500 });
    }
}
