import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { stripeClient } from '@/lib/billing/stripe';
import { getSuggestedTenantLoginDomain, normalizeEmail } from '@/lib/tenant-login-domains';

export async function POST(req: NextRequest) {
    const client = await getPool().connect();

    try {
        const body = await req.json();
        const { tenantName, adminEmail, adminPassword } = body;

        if (!tenantName || !adminEmail || !adminPassword) {
            return NextResponse.json({ message: 'Todos os campos sao obrigatorios' }, { status: 400 });
        }

        const normalizedAdminEmail = normalizeEmail(adminEmail);
        const slug = tenantName.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        const suggestedDomain = getSuggestedTenantLoginDomain(normalizedAdminEmail);

        await client.query('BEGIN');

        const tenantRes = await client.query(
            "INSERT INTO tenants (name, slug, status) VALUES ($1, $2, 'PENDING') RETURNING id",
            [tenantName, slug]
        );
        const tenantId = tenantRes.rows[0].id;

        let stripeCustomerId = null;
        let checkoutUrl = null;

        try {
            const stripeCustomer = await stripeClient.createCustomer(normalizedAdminEmail, tenantName);
            stripeCustomerId = stripeCustomer.id;

            const session = await stripeClient.createCheckoutSession(stripeCustomerId, tenantId);
            checkoutUrl = session.url;

            await client.query(
                "UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2",
                [stripeCustomerId, tenantId]
            );
        } catch (stripeErr) {
            console.error('Stripe Integration Error', stripeErr);
        }

        await client.query(`SET app.current_tenant_id = ${client.escapeLiteral(tenantId)}`);

        await client.query(
            `INSERT INTO site_settings (id, tenant_id, company_name, platform_label) 
             VALUES ($1, $2, $3, $4)`,
            ['primary', tenantId, tenantName, 'Inventario Agil']
        );

        const seedUOMs = [
            ['UN', 'Unidade'],
            ['KG', 'Quilograma'],
            ['MT', 'Metros'],
            ['PCT', 'Pacote'],
        ];

        for (const [code, desc] of seedUOMs) {
            await client.query(
                `INSERT INTO uoms (code, description, tenant_id) VALUES ($1, $2, $3)`,
                [code, desc, tenantId]
            );
        }

        if (suggestedDomain) {
            await client.query(
                `INSERT INTO tenant_login_domains (tenant_id, domain)
                 VALUES ($1, $2)
                 ON CONFLICT (domain) DO NOTHING`,
                [tenantId, suggestedDomain]
            );
        }

        const userId = `usr-${Math.random().toString(36).substring(2, 10)}`;
        await client.query(
            `INSERT INTO users (id, name, email, password_hash, role, tenant_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'Administrador', normalizedAdminEmail, passwordHash, 'Admin', tenantId]
        );

        await client.query('COMMIT');

        return NextResponse.json({
            message: 'Empresa cadastrada com sucesso!',
            tenantId,
            slug,
            checkoutUrl,
            loginDomain: suggestedDomain,
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Registration error', err);

        if (err.code === '23505') {
            return NextResponse.json({ message: 'Email, dominio ou nome de empresa ja cadastrados' }, { status: 400 });
        }

        return NextResponse.json({ message: 'Erro ao processar cadastro' }, { status: 500 });
    } finally {
        client.release();
    }
}
