const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        console.log('--- Forçando RLS para todos os usuários (incluindo Owner) ---');

        const tables = ['users', 'site_settings', 'orders', 'materials', 'stock_balances', 'uoms', 'categories', 'production_tasks', 'inventory_receipts', 'notifications', 'production_reservations'];

        for (const table of tables) {
            console.log(`Aplicando FORCE RLS em: ${table}`);
            await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
            await client.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);

            // Re-garantir a política padrão de isolamento
            await client.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table}`);
            await client.query(`CREATE POLICY tenant_isolation_policy ON ${table} USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)`);
        }

        console.log('\n--- RLS Reforçado com Sucesso! ---');

    } catch (err) {
        console.error('Erro ao reforçar RLS:', err);
    } finally {
        await client.end();
    }
}

run();
