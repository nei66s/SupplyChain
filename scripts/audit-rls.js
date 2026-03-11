const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        console.log('--- Verificando RLS e Políticas ---');

        // Check if RLS is enabled on tables
        const tablesRes = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('orders', 'tenants', 'users', 'materials', 'stock_balances');
        `);
        console.table(tablesRes.rows);

        // Check policies
        const policiesRes = await client.query(`
            SELECT tablename, policyname, roles, cmd, qual 
            FROM pg_policies 
            WHERE schemaname = 'public';
        `);
        console.log('\n--- Políticas de Segurança Ativas ---');
        console.table(policiesRes.rows);

        // Verification of specific orders
        const ordersRes = await client.query(`
            SELECT o.id, o.order_number, o.tenant_id, t.name as tenant_name 
            FROM orders o
            JOIN tenants t ON o.tenant_id = t.id
            LIMIT 10;
        `);
        console.log('\n--- Pedidos Atuais no Banco e seus Donos ---');
        console.table(ordersRes.rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

run();
