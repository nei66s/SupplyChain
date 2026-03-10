const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query(`
    SELECT id, name, email, role, tenant_id FROM users WHERE role = 'Admin';
  `);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}

run().catch(console.error);
