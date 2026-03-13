const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        const res = await client.query("SELECT usename, usesuper FROM pg_user WHERE usename = current_user");
        console.log('USUÁRIO ATUAL:', res.rows[0]);

        const rlsRes = await client.query("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'users'");
        console.log('STATUS RLS USERS:', rlsRes.rows[0]);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
