import { query } from './src/lib/db';
async function run() {
    try {
        const res = await query("SELECT id, order_number, status, source, trashed_at FROM orders");
        console.log('CURRENT DATABASE ORDERS:');
        console.log(JSON.stringify(res.rows, null, 2));

        const views = await query("SELECT status, count(*) FROM dashboard_orders_view GROUP BY status");
        console.log('MATERIALIZED VIEW COUNTS:');
        console.log(JSON.stringify(views.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
