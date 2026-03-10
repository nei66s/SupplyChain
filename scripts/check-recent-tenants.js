const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query(`
        SELECT name, created_at, subscription_status 
        FROM tenants 
        ORDER BY created_at DESC 
        LIMIT 10;
    `);

    console.log('--- Últimos 10 Tenants ---');
    res.rows.forEach(row => {
        console.log(`${row.created_at.toISOString()} | ${row.name.padEnd(25)} | ${row.subscription_status}`);
    });

    await client.end();
}

run().catch(console.error);
