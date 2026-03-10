const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    await client.query(`
        UPDATE tenants 
        SET subscription_status = 'ACTIVE', 
            subscription_expires_at = NOW() + INTERVAL '32 days'
        WHERE name = 'Empresa do Nei';
    `);

    console.log('✅ Empresa do Nei ativada manualmente!');
    await client.end();
}

run().catch(console.error);
