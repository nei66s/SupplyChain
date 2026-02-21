import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { notifyProductionTaskCreated } from '@/lib/notifications'

type DbRow = {
  id: number
  order_id: number
  material_id: number
  qty_to_produce: string | number
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE'
  created_at: string
  updated_at: string
  order_number: string | null
  material_name: string | null
  order_source: string | null
  color?: string | null
  description?: string | null
}

function toApiTask(row: DbRow) {
  return {
    id: `PT-${row.id}`,
    orderId: `O-${row.order_id}`,
    materialId: `M-${row.material_id}`,
    orderNumber: row.order_number || `O-${row.order_id}`,
    materialName: row.material_name || `M-${row.material_id}`,
    qtyToProduce: Number(row.qty_to_produce ?? 0),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isMrp: String(row.order_source ?? '').toLowerCase() === 'mrp',
    color: row.color ?? '',
    description: row.description ?? undefined,
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function GET() {
  try {
    const res = await pool.query(
      `SELECT
         pt.id,
         pt.order_id,
         pt.material_id,
         pt.qty_to_produce,
         pt.status,
         pt.created_at,
         pt.updated_at,
       o.order_number,
       o.source AS order_source,
       m.name AS material_name,
        oi.color AS color,
        oi.item_description AS description
       FROM production_tasks pt
       LEFT JOIN orders o ON o.id = pt.order_id
       LEFT JOIN materials m ON m.id = pt.material_id
       LEFT JOIN order_items oi ON oi.order_id = pt.order_id AND oi.material_id = pt.material_id
       WHERE o.trashed_at IS NULL
         AND (o.status IS NULL OR lower(o.status) NOT IN ('cancelado', 'finalizado'))
         -- allow MRP-created orders to appear even if their status is 'RASCUNHO' or 'DRAFT'
         AND NOT (
           lower(coalesce(o.status, '')) IN ('rascunho', 'draft')
           AND lower(coalesce(o.source, '')) <> 'mrp'
         )
       ORDER BY pt.created_at ASC, pt.id ASC`
    )

    const rows = res.rows as DbRow[]
    return NextResponse.json(rows.map(toApiTask))
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const orderId = Number(String(payload.orderId ?? '').replace(/\D+/g, ''))
    const materialId = Number(String(payload.materialId ?? '').replace(/\D+/g, ''))
    const qtyToProduce = Number(payload.qtyToProduce ?? 0)

    const errors: Record<string, string> = {}
    if (!orderId) errors.orderId = 'orderId é obrigatório'
    if (!materialId) errors.materialId = 'materialId é obrigatório'
    if (Number.isNaN(qtyToProduce) || qtyToProduce <= 0) errors.qtyToProduce = 'qtyToProduce deve ser maior que zero'
    if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 })

    const res = await pool.query(
       `INSERT INTO production_tasks (order_id, material_id, qty_to_produce, status)
       VALUES ($1, $2, $3, 'PENDING')
       ON CONFLICT (order_id, material_id)
       DO UPDATE SET
         qty_to_produce = EXCLUDED.qty_to_produce,
         status = CASE
           WHEN production_tasks.status = 'DONE' THEN production_tasks.status
           ELSE 'PENDING'
         END,
         updated_at = now()
       RETURNING id, order_id, material_id, qty_to_produce, status, created_at, updated_at,
         (SELECT order_number FROM orders WHERE id = production_tasks.order_id) AS order_number,
         (SELECT source FROM orders WHERE id = production_tasks.order_id) AS order_source,
        (SELECT name FROM materials WHERE id = production_tasks.material_id) AS material_name,
        (SELECT color FROM order_items WHERE order_id = production_tasks.order_id AND material_id = production_tasks.material_id LIMIT 1) AS color,
        (SELECT item_description FROM order_items WHERE order_id = production_tasks.order_id AND material_id = production_tasks.material_id LIMIT 1) AS description`
      ,
      [orderId, materialId, qtyToProduce]
    )
    const createdRow = res.rows[0] as DbRow
    // If this was created for an MRP order, ensure the order has an order_items row
    try {
      const orderSrcRes = await pool.query<{ source: string }>('SELECT source FROM orders WHERE id = $1', [createdRow.order_id])
      const orderSource = String(orderSrcRes.rows[0]?.source ?? '').toLowerCase()
      const resultingQty = Number(createdRow.qty_to_produce ?? 0)
      if (orderSource === 'mrp' && resultingQty > 0) {
        const existing = await pool.query('SELECT id FROM order_items WHERE order_id = $1 AND material_id = $2 LIMIT 1', [createdRow.order_id, createdRow.material_id])
        if (existing.rowCount > 0) {
          await pool.query(
            'UPDATE order_items SET quantity = $3, item_description = COALESCE($4, item_description) WHERE order_id = $1 AND material_id = $2',
            [createdRow.order_id, createdRow.material_id, resultingQty, createdRow.description ?? null]
          )
        } else {
          await pool.query(
            `INSERT INTO order_items (order_id, material_id, quantity, unit_price, color, shortage_action, item_description)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [createdRow.order_id, createdRow.material_id, resultingQty, 0, '', 'PRODUCE', createdRow.description ?? null]
          )
        }
      }
    } catch (e) {
      console.error('upsert order_items for production task (app) error', e)
    }

    // Also create/update a production reservation tied to this order/material
    try {
        if (Number(createdRow.qty_to_produce ?? 0) > 0) {
         await pool.query(
          `INSERT INTO production_reservations (order_id, material_id, qty, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (order_id, material_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()`,
          [orderId, materialId, Number(createdRow.qty_to_produce ?? 0)]
        )
      } else {
        // If qty is zero, ensure no lingering reservation remains
        await pool.query(`DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2`, [orderId, materialId])
      }
    } catch (e) {
      // don't fail the whole request for reservation write issues; log and continue
      console.error('production reservation upsert error', e)
    }
    const createdQty = Number(res.rows[0].qty_to_produce ?? 0)
        // ensure order_items exist for MRP-created tasks even if qty is zero
        try {
          const orderSrc = String(createdRow.order_source ?? '').toLowerCase()
          if (orderSrc === 'mrp') {
            const existing = await pool.query('SELECT id FROM order_items WHERE order_id = $1 AND material_id = $2 LIMIT 1', [createdRow.order_id, createdRow.material_id])
            if (existing.rowCount > 0) {
              await pool.query('UPDATE order_items SET quantity = $3, item_description = COALESCE($4, item_description) WHERE order_id = $1 AND material_id = $2', [createdRow.order_id, createdRow.material_id, createdQty, createdRow.description ?? null])
            } else {
              await pool.query(`INSERT INTO order_items (order_id, material_id, quantity, unit_price, color, shortage_action, item_description) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [createdRow.order_id, createdRow.material_id, createdQty, 0, '', 'PRODUCE', createdRow.description ?? null])
            }
          }
        } catch (e) {
          console.error('upsert order_items for production task (app) error', e)
        }
        if (createdQty > 0) {
          await notifyProductionTaskCreated({
            orderId,
            materialId,
            orderNumber: createdRow.order_number,
            materialName: createdRow.material_name,
            qty: createdQty,
          })
        }

        return NextResponse.json(toApiTask(createdRow), { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
