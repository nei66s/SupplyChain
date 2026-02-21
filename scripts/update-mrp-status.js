require('dotenv').config()
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const pool = new Pool({ connectionString })

;(async () => {
  try {
    const res = await pool.query(
      `UPDATE orders
       SET status = 'aberto'
       WHERE lower(source) = 'mrp'
         AND lower(status) IN ('rascunho','draft')
       RETURNING id, order_number, status`
    )
    console.log(`Updated ${res.rowCount} orders`)
    if (res.rowCount > 0) {
      res.rows.forEach((r) => console.log(`id=${r.id} order_number=${r.order_number} status=${r.status}`))
    }
    process.exit(0)
  } catch (err) {
    console.error('Error updating MRP orders status:', err)
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
})()
