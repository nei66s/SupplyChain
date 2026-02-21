const { Client } = require('pg')

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const sql = `
      SELECT m.id, m.name,
        COALESCE(sb.on_hand,0) AS on_hand,
        COALESCE((SELECT SUM(sr.qty) FROM stock_reservations sr WHERE sr.material_id = m.id AND sr.expires_at > now()),0) AS reserved_total,
        COALESCE((SELECT SUM(qty) FROM production_reservations pr WHERE pr.material_id = m.id),0) AS production_reserved
      FROM materials m
      LEFT JOIN stock_balances sb ON sb.material_id = m.id
      WHERE lower(m.name) LIKE $1
      LIMIT 10
    `
    const term = '%fibra%'
    const r = await client.query(sql, [term])
    console.log('results:', JSON.stringify(r.rows, null, 2))
  } catch (err) {
    console.error('Query failed', err.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
