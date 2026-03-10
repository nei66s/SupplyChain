import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { asaas } from '@/lib/billing/asaas';

/**
 * API PÚBLICA DE AUTOCADASTRO (MECANISMO DE NOVOS CLIENTES)
 */
export async function POST(req: NextRequest) {
    const client = await getPool().connect();
    try {
        const body = await req.json();
        const { tenantName, adminEmail, adminPassword } = body;

        if (!tenantName || !adminEmail || !adminPassword) {
            return NextResponse.json({ message: 'Todos os campos são obrigatórios' }, { status: 400 });
        }

        const slug = tenantName.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await client.query('BEGIN');

        // 1. Criar Tenant (Inicia como PENDING)
        const tenantRes = await client.query(
            "INSERT INTO tenants (name, slug, status) VALUES ($1, $2, 'PENDING') RETURNING id",
            [tenantName, slug]
        );
        const tenantId = tenantRes.rows[0].id;

        // 2. Criar Cliente no Asaas para este Tenant
        let asaasCustomerId = null;
        let checkoutUrl = null;

        try {
            const asaasCustomer = await asaas.createCustomer({
                name: tenantName,
                email: adminEmail,
            });
            asaasCustomerId = asaasCustomer.id;

            // Criar uma cobrança de R$ 5.00 via PIX/BOLETO/CARTÃO (UNDEFINED permite ao cliente escolher)
            const payment = await asaas.createCombinedPayment({
                customer: asaasCustomerId,
                billingType: 'UNDEFINED',
                value: 5.00,
                nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
                description: `Ativação de Instância - ${tenantName}`,
                externalReference: tenantId, // Crucial para o Webhook saber quem pagou!
            });

            checkoutUrl = payment.invoiceUrl || payment.bankSlipUrl;

            // Atualizar o tenant com o ID do Asaas
            await client.query(
                "UPDATE tenants SET asaas_customer_id = $1 WHERE id = $2",
                [asaasCustomerId, tenantId]
            );
        } catch (asaasErr) {
            console.error('Asaas Integration Error', asaasErr);
            // Prossegue mesmo se o Asaas falhar, mas loga o erro
        }

        // 3. Criar Configurações de Site do Tenant
        await client.query(`SET app.current_tenant_id = ${client.escapeLiteral(tenantId)}`);

        await client.query(
            `INSERT INTO site_settings (id, tenant_id, company_name, platform_label) 
             VALUES ($1, $2, $3, $4)`,
            ['primary', tenantId, tenantName, 'Inventário Ágil']
        );

        // 4. Seed Data (Onboarding)
        // Adicionar Unidades de Medida padrão
        const seedUOMs = [
            ['UN', 'Unidade'],
            ['KG', 'Quilograma'],
            ['MT', 'Metros'],
            ['PCT', 'Pacote']
        ];

        for (const [code, desc] of seedUOMs) {
            await client.query(
                `INSERT INTO uoms (code, description, tenant_id) VALUES ($1, $2, $3)`,
                [code, desc, tenantId]
            );
        }

        // 3. Criar Usuário Admin do Tenant
        const userId = `usr-${Math.random().toString(36).substring(2, 10)}`;
        await client.query(
            `INSERT INTO users (id, name, email, password_hash, role, tenant_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'Administrador', adminEmail.toLowerCase(), passwordHash, 'Admin', tenantId]
        );


        await client.query('COMMIT');

        return NextResponse.json({
            message: 'Empresa cadastrada com sucesso!',
            tenantId,
            slug,
            checkoutUrl
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Registration error', err);
        if (err.code === '23505') {
            return NextResponse.json({ message: 'Email ou Nome de Empresa já cadastrados' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Erro ao processar cadastro' }, { status: 500 });
    } finally {
        client.release();
    }
}
