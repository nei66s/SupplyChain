const { Pool } = require('pg');
require('dotenv').config();

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log('Checking views...');
        const views = await pool.query(`
            SELECT matviewname 
            FROM pg_matviews 
            WHERE matviewname IN ('dashboard_orders_view', 'dashboard_production_tasks_view', 'dashboard_materials_stock_view', 'mv_inventory_receipts_snapshot')
        `);
        console.log('Materialized views found:', views.rows.map(r => r.matviewname));

        const orders = await pool.query('SELECT id, order_number, status FROM orders ORDER BY id DESC LIMIT 5');
        console.log('Last 5 orders in table:', JSON.stringify(orders.rows, null, 2));

        const viewOrders = await pool.query('SELECT order_id, order_number, status FROM dashboard_orders_view ORDER BY order_id DESC LIMIT 5');
        console.log('Last 5 orders in view:', JSON.stringify(viewOrders.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
