const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    // 1. Get the latest tenant
    const tenantRes = await client.query(`
        SELECT id, name FROM tenants ORDER BY created_at DESC LIMIT 1;
    `);
    const tenant = tenantRes.rows[0];

    if (!tenant) {
        console.log('Nenhum tenant encontrado.');
        await client.end();
        return;
    }

    console.log(`\n--- Verificando Integraidade do Tenant: ${tenant.name} (${tenant.id}) ---`);

    // 2. Check site settings
    const settingsRes = await client.query('SELECT * FROM site_settings WHERE tenant_id = $1', [tenant.id]);
    console.log(`Configurações de Site: ${settingsRes.rows.length > 0 ? '✅ OK' : '❌ NÃO ENCONTRADO'}`);

    // 3. Check admin user
    const userRes = await client.query('SELECT name, email, role FROM users WHERE tenant_id = $1', [tenant.id]);
    console.log(`Usuário Admin: ${userRes.rows.length > 0 ? '✅ OK (' + userRes.rows[0].email + ')' : '❌ NÃO ENCONTRADO'}`);

    // 4. Check UOMs (Seeds)
    const uomRes = await client.query('SELECT count(*) FROM uoms WHERE tenant_id = $1', [tenant.id]);
    console.log(`Unidades de Medida (UOMs): ${uomRes.rows[0].count > 0 ? '✅ OK (' + uomRes.rows[0].count + ' registros)' : '❌ NÃO ENCONTRADO'}`);

    await client.end();
}

run().catch(console.error);
