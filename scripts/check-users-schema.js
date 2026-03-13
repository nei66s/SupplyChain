const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('Colunas da tabela users:', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}
run();
