require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

;(async () => {
  try {
    const res = await pool.query(
      `SELECT pt.id, pt.order_id, o.order_number, pt.material_id, pt.qty_to_produce, pt.status
       FROM production_tasks pt
       JOIN orders o ON o.id = pt.order_id
       WHERE lower(coalesce(o.source, '')) = 'mrp'
       ORDER BY pt.id DESC`
    )
    console.log('production tasks for MRP orders:', res.rowCount)
    for (const r of res.rows) {
      console.log(r)
    }
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
})()
