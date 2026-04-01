const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT pg_get_viewdef('dashboard_orders_view', true);");

        const outputDir = path.join(__dirname, 'tmp');
        const outputPath = path.join(outputDir, 'view_def.sql');

        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputPath, res.rows[0].pg_get_viewdef);
        console.log(`Definicao salva em ${outputPath}`);
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

run();
