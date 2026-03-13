const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        console.log('--- Auditoria de Usuários e Tenants ---');

        // 1. Contar usuários sem tenant_id
        const nullRes = await client.query("SELECT COUNT(*) FROM users WHERE tenant_id IS NULL");
        console.log(`Usuários com tenant_id NULO: ${nullRes.rows[0].count}`);

        if (parseInt(nullRes.rows[0].count) > 0) {
            console.log('\n--- Detalhes dos usuários sem tenant ---');
            const detailsNull = await client.query("SELECT id, email, name FROM users WHERE tenant_id IS NULL");
            console.table(detailsNull.rows);
        }

        // 2. Distribuição de usuários por tenant
        const distRes = await client.query(`
            SELECT t.name as tenant_name, COUNT(u.id) as user_count, t.id as tenant_id
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id
            GROUP BY t.name, t.id
            ORDER BY user_count DESC
        `);
        distRes.rows.forEach(r => {
            console.log(`- Tenant: ${r.tenant_name.padEnd(25)} | Usuários: ${r.user_count} | ID: ${r.tenant_id}`);
        });

        // 3. Verificar se existe algum tenant_id que não está na tabela de tenants (integridade)
        const orphanRes = await client.query(`
            SELECT u.email, u.tenant_id 
            FROM users u 
            WHERE u.tenant_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = u.tenant_id)
        `);
        console.log(`\nUsuários com tenant_id órfão: ${orphanRes.rowCount}`);
        orphanRes.rows.forEach(r => {
            console.log(`- Email: ${r.email} | Tenant ID: ${r.tenant_id}`);
        });

    } catch (err) {
        console.error('Erro na auditoria:', err);
    } finally {
        await client.end();
    }
}

run();
