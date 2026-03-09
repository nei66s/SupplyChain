import { query } from './src/lib/db';
import * as fs from 'fs';
async function run() {
    try {
        const res = await query("SELECT id, order_number, status, source, trashed_at FROM orders");
        let out = 'ALL ORDERS:\n';
        for (const order of res.rows) {
            const tasks = await query("SELECT id, status FROM production_tasks WHERE order_id = $1", [order.id]);
            const hasPending = tasks.rows.length > 0 && tasks.rows.some(t => t.status !== 'DONE');
            out += `Order ${order.id} (${order.order_number}): status=${order.status}, source=${order.source}, hasPending=${hasPending}, trashed=${!!order.trashed_at}\n`;
            if (tasks.rows.length > 0) {
                out += `  Tasks: ${tasks.rows.map(t => t.status).join(', ')}\n`;
            }
        }
        fs.writeFileSync('debug_mrp_out.txt', out);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
