const { Pool } = require('pg');
require('dotenv').config();

async function run() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });
    try {
        const fs = require('fs');
        const sql = fs.readFileSync('migrations/048_order_number_counters_multi_tenant.sql', 'utf8');
        await pool.query(sql);
        console.log('Migration 048 executed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}
run();
