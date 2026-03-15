const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const tables = ['precondition_categories', 'precondition_values', 'people_activity_log'];

    for (const table of tables) {
        console.log(`Enabling RLS for ${table}...`);
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
        await client.query(`DROP POLICY IF EXISTS tenant_isolation ON ${table};`);
        await client.query(`
            CREATE POLICY tenant_isolation ON ${table}
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
        `);
    }

    console.log('Done.');
    await client.end();
}

run().catch(console.error);
