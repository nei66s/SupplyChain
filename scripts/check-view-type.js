const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        const res = await client.query(`
            SELECT relname, relkind 
            FROM pg_class 
            WHERE relname IN ('dashboard_orders_view', 'dashboard_production_tasks_view', 'dashboard_materials_stock_view');
        `);

        console.log('--- Tipos de Visualizações (v = View, m = Materialized View) ---');
        res.rows.forEach(r => {
            const type = r.relkind === 'm' ? 'Materialized View' : (r.relkind === 'v' ? 'View' : r.relkind);
            console.log(`${r.relname}: ${type}`);
        });

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

run();
