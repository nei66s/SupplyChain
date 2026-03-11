const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query("SELECT pg_get_viewdef('dashboard_orders_view', true);");
        fs.writeFileSync('c:/Users/valdi/Desktop/Inventario-Agil/view_def.sql', res.rows[0].pg_get_viewdef);
        console.log('Definição salva em view_def.sql');
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

run();
