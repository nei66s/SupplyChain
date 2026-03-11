const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        const views = ['dashboard_orders_view', 'dashboard_production_tasks_view', 'dashboard_materials_stock_view'];

        for (const view of views) {
            console.log(`\n--- Colunas de ${view} ---`);
            const res = await client.query(`
                SELECT attname as column_name
                FROM pg_attribute
                WHERE attrelid = $1::regclass
                AND attnum > 0
                AND NOT attisdropped;
            `, [view]);
            console.log(res.rows.map(r => r.column_name).join(', '));
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

run();
