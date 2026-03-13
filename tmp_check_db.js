const { Pool } = require('pg');
require('dotenv').config();

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'order_number_counters'
    `);
        console.log(JSON.stringify(res.rows, null, 2));
    } finally {
        await pool.end();
    }
}
check();
