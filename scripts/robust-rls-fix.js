const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        // 1. Get ALL tables that have a tenant_id column
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'tenant_id' 
            AND table_schema = 'public'
        `);

        const tables = res.rows.map(r => r.table_name);
        console.log('Tabelas encontradas para isolamento:', tables.join(', '));

        for (const table of tables) {
            console.log(`\nAplicando em: ${table}`);
            try {
                await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
                await client.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
                await client.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}"`);
                await client.query(`
                    CREATE POLICY tenant_isolation_policy ON "${table}" 
                    FOR ALL 
                    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                `);
                console.log(`- OK`);
            } catch (e) {
                console.error(`- ERRO em ${table}:`, e.message);
            }
        }
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}
run();
