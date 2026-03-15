const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'tenant_id'
        ORDER BY table_name;
    `);
    console.log('Tables with tenant_id column:');
    console.table(res.rows);

    await client.end();
}

run().catch(console.error);
