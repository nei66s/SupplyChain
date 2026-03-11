const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query(`
        SELECT u.email, t.name as tenant_name, t.subscription_status, u.created_at 
        FROM users u 
        JOIN tenants t ON u.tenant_id = t.id 
        ORDER BY u.created_at DESC 
        LIMIT 10;
    `);

    console.log('--- Lista de Últimos E-mails no Banco ---');
    console.table(res.rows);
    await client.end();
}

run().catch(console.error);
