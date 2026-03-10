const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query(`
        SELECT t.id, t.name, u.email 
        FROM tenants t 
        JOIN users u ON u.tenant_id = t.id 
        WHERE t.name = 'Empresa do Nei' 
        AND u.role = 'Admin';
    `);

    console.log(res.rows);
    await client.end();
}

run().catch(console.error);
