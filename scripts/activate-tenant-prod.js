const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query("UPDATE tenants SET status = 'ACTIVE' WHERE name = 'Teste Stripe 2' RETURNING id");
        if (res.rowCount > 0) {
            console.log('✅ SUCESSO: Empresa Teste Stripe 2 agora está ATIVA no banco.');
        } else {
            console.log('❌ ERRO: Empresa não encontrada.');
        }
    } catch (err) {
        console.error('Erro ao conectar ou atualizar:', err);
    } finally {
        await client.end();
    }
}

run();
