const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const res = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public';
    `);
    console.log('RLS Status per table:');
    console.table(res.rows);

    await client.end();
}

run().catch(console.error);
