const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const statements = [
        "DROP MATERIALIZED VIEW IF EXISTS dashboard_orders_view CASCADE",
        "DROP MATERIALIZED VIEW IF EXISTS dashboard_production_tasks_view CASCADE",
        "DROP MATERIALIZED VIEW IF EXISTS dashboard_materials_stock_view CASCADE",
        "DROP MATERIALIZED VIEW IF EXISTS mv_inventory_receipts_snapshot CASCADE"
    ];

    for (const s of statements) {
        try {
            console.log(`Running: ${s}`);
            await client.query(s);
        } catch (e) {
            console.error(`Failed: ${s}`, e.message);
        }
    }

    await client.end();
}

run();
