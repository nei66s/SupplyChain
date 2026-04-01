import { NextRequest, NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { stripeClient } from '@/lib/billing/stripe';

export async function POST(req: NextRequest) {
    try {
        const auth = getAuthPayload(req);
        if (!auth) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

        // Parse body optionally
        let interval: 'month' | 'year' = 'month';
        let quantity: number = 1;
        try {
            const body = await req.json();
            if (body && body.interval === 'year') {
                interval = 'year';
            }
            if (body && typeof body.quantity === 'number' && body.quantity > 0) {
                quantity = body.quantity;
            }
        } catch {
            // Ignore if no body
        }

        const pool = getPool();

        // 1. Get Tenant Data
        const tenantRes = await pool.query(
            'SELECT id, name, stripe_customer_id FROM tenants WHERE id = $1',
            [auth.tenantId]
        );
        const tenant = tenantRes.rows[0];
        if (!tenant) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 });

        let customerId = tenant.stripe_customer_id;

        // 2. Create Stripe Customer if not exists
        if (!customerId) {
            // Find admin user to get email
            const adminRes = await pool.query("SELECT email FROM users WHERE tenant_id = $1 AND role = 'Admin' LIMIT 1", [auth.tenantId]);
            const adminEmail = adminRes.rows[0]?.email;

            const customer = await stripeClient.createCustomer(adminEmail || `billing-${tenant.id}@blacktowerx.com.br`, tenant.name);
            customerId = customer.id;
            await pool.query('UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2', [customerId, tenant.id]);
        }

        // 3. Create Checkout Session
        const session = await stripeClient.createCheckoutSession(customerId, auth.tenantId, interval, quantity);

        return NextResponse.json({
            checkoutUrl: session.url
        });

    } catch (err: any) {
        console.error('[Billing Checkout Error]', err);
        return NextResponse.json({ message: err.message || 'Erro ao processar faturamento' }, { status: 500 });
    }
}
