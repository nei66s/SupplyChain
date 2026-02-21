require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

;(async () => {
  try {
    const tasksRes = await pool.query(
      `SELECT pt.id AS task_id, pt.order_id, pt.material_id, pt.qty_to_produce, m.description
       FROM production_tasks pt
       JOIN orders o ON o.id = pt.order_id
       LEFT JOIN order_items oi ON oi.order_id = pt.order_id AND oi.material_id = pt.material_id
       LEFT JOIN materials m ON m.id = pt.material_id
       WHERE lower(coalesce(o.source, '')) = 'mrp'
         AND (oi.id IS NULL)`
    )
    console.log('tasks needing items:', tasksRes.rowCount)
    let created = 0
    for (const t of tasksRes.rows) {
      try {
        await pool.query(
          `INSERT INTO order_items (order_id, material_id, quantity, unit_price, color, shortage_action, item_description)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [t.order_id, t.material_id, t.qty_to_produce, 0, '', 'PRODUCE', t.description || null]
        )
        created++
        console.log(`Inserted order_item for order=${t.order_id} material=${t.material_id} qty=${t.qty_to_produce}`)
      } catch (e) {
        console.error('insert error for', t.order_id, t.material_id, e.message || e)
      }
    }
    console.log('done. created:', created)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
})()
