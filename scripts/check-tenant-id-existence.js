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
            const res = await client.query(`
                SELECT count(*) FROM pg_attribute
                WHERE attrelid = $1::regclass
                AND attname = 'tenant_id'
                AND attnum > 0
                AND NOT attisdropped;
            `, [view]);

            const hasTenant = parseInt(res.rows[0].count) > 0;
            console.log(`${view} tem tenant_id? ${hasTenant ? 'SIM' : 'NÃO'}`);
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

run();
