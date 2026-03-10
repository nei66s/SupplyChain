const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query(`
        SELECT name, subscription_status, asaas_customer_id, asaas_subscription_id 
        FROM tenants 
        WHERE name = 'Empresa do Nei';
    `);

    console.log(res.rows);
    await client.end();
}

run().catch(console.error);
