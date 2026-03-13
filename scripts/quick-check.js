const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const tenantId = 'fa04bb25-240c-4da1-ba2b-2cde3c613180';
        await client.query(`SET app.current_tenant_id = '${tenantId}'`);
        const res = await client.query("SELECT id, email, tenant_id FROM users");
        console.log('COUNT:' + res.rowCount);
        console.log('EMAILS:' + res.rows.map(r => r.email).join(','));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
