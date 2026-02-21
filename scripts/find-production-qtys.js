require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
;(async () => {
  try {
    const res = await pool.query(
      `SELECT pt.id, pt.order_id, o.order_number, pt.material_id, pt.qty_to_produce, pt.status
       FROM production_tasks pt
       JOIN orders o ON o.id = pt.order_id
       WHERE COALESCE(NULLIF(pt.qty_to_produce::text, ''), '0')::numeric > 0
       ORDER BY pt.id DESC LIMIT 100`
    )
    console.log('tasks with qty>0:', res.rowCount)
    res.rows.forEach(r => console.log(r))
    process.exit(0)
  } catch (e) { console.error(e); process.exit(2) } finally { try { await pool.end() } catch (e) {} }
})()
