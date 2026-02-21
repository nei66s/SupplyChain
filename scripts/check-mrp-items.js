require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

;(async () => {
  try {
    const ordersRes = await pool.query(
      `SELECT o.id, o.order_number, o.status
       FROM orders o
       WHERE lower(coalesce(o.source, '')) = 'mrp'
       ORDER BY o.id DESC
       LIMIT 20`
    )
    console.log('Found orders:', ordersRes.rowCount)
    for (const o of ordersRes.rows) {
      console.log('---')
      console.log(`Order id=${o.id} order_number=${o.order_number} status=${o.status}`)
      const itemsRes = await pool.query(
        `SELECT id, material_id, quantity, qty_to_produce, qty_reserved_from_stock, item_description, color
         FROM order_items
         WHERE order_id = $1`,
        [o.id]
      )
      console.log(' items:', itemsRes.rowCount)
      for (const it of itemsRes.rows) {
        console.log(`  item id=${it.id} material_id=${it.material_id} quantity=${it.quantity} qty_to_produce=${it.qty_to_produce} reserved=${it.qty_reserved_from_stock} desc=${it.item_description} color=${it.color}`)
      }
    }
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
})()
