const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function run() {
    const sql = fs.readFileSync('migrations/039_activate_rls.sql', 'utf8');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query(sql);
        console.log('✅ RLS Publico Ativado com sucesso');
    } catch (e) {
        console.error('❌ Erro ao ativar RLS:', e.message);
    } finally {
        await client.end();
    }
}

run();
