const { Pool } = require('pg');
require('dotenv').config();

async function refresh() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('Refreshing materialized views...');
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_orders_view');
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_production_tasks_view');
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_materials_stock_view');
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_receipts_snapshot');
        console.log('Done.');

        const viewOrders = await pool.query('SELECT order_id, order_number, status FROM dashboard_orders_view ORDER BY order_id DESC LIMIT 5');
        console.log('Last 5 orders in view after refresh:', JSON.stringify(viewOrders.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
refresh();
