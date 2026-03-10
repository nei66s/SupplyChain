const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    try {
        // 1. Atualiza o nome da empresa cliente (O primeiro tenant)
        await client.query("UPDATE tenants SET name = 'São José Cordas', slug = 'sao-jose-cordas' WHERE slug = 'black-tower-x'");

        // 2. Garante que as configurações de site para esse tenant reflitam o cliente
        const tRes = await client.query("SELECT id FROM tenants WHERE slug = 'sao-jose-cordas' LIMIT 1");
        const tenantId = tRes.rows[0].id;

        await client.query("UPDATE site_settings SET company_name = 'São José Cordas' WHERE tenant_id = $1", [tenantId]);

        console.log('✅ Tenant inicial corrigido para: São José Cordas');
    } catch (e) {
        console.error('❌ Erro ao corrigir tenant:', e.message);
    } finally {
        await client.end();
    }
}

run();
