import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const RESERVATION_TTL_MS = 5 * 60 * 1000

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

function parseOrderIdFromSourceRef(sourceRef?: string | null): number | null {
  if (!sourceRef) return null
  const trimmed = String(sourceRef).trim()
  const match = trimmed.match(/^O-(\d+)$/i)
  if (match) return Number(match[1])
  return null
}

async function allocateToOrders(
  client: import('pg').Pool | import('pg').PoolClient,
  materialId: number,
  qtyAvailable: number,
  userId: string | null
) {
  if (qtyAvailable <= 0) return
  const itemsRes = await client.query<{
    id: number
    order_id: number
    quantity: string | number
    qty_reserved_from_stock: string | number
    shortage_action: string | null
  }>(
    `SELECT oi.id, oi.order_id, oi.quantity, oi.qty_reserved_from_stock, oi.shortage_action
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.material_id = $1
       AND o.trashed_at IS NULL
       AND (o.status IS NULL OR lower(o.status) NOT IN ('cancelado', 'finalizado'))
     ORDER BY o.created_at ASC`,
    [materialId]
  )
  let remaining = qtyAvailable
  for (const row of itemsRes.rows) {
    if (remaining <= 0) break
    const requested = Number(row.quantity ?? 0)
    const reserved = Number(row.qty_reserved_from_stock ?? 0)
    const needed = Math.max(0, requested - reserved)
    if (needed <= 0) continue
    const alloc = Math.min(remaining, needed)
    const nextReserved = reserved + alloc
    const shortageAction = String(row.shortage_action ?? 'PRODUCE').toUpperCase()
    const qtyToProduce = shortageAction === 'BUY' ? 0 : Math.max(0, requested - nextReserved)
    await client.query(
      `UPDATE order_items
       SET qty_reserved_from_stock = $3, qty_to_produce = $4
       WHERE id = $1 AND order_id = $2`,
      [row.id, row.order_id, nextReserved, qtyToProduce]
    )
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString()
    await client.query(
      `INSERT INTO stock_reservations (order_id, material_id, user_id, qty, expires_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,now(),now())
       ON CONFLICT (order_id, material_id)
       DO UPDATE SET qty = EXCLUDED.qty, user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, updated_at = now()`,
      [row.order_id, materialId, userId, nextReserved, expiresAt]
    )
    if (qtyToProduce <= 0) {
      await client.query('DELETE FROM production_tasks WHERE order_id = $1 AND material_id = $2', [row.order_id, materialId])
      await client.query('DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2', [row.order_id, materialId])
    } else {
      await client.query(
        `INSERT INTO production_tasks (order_id, material_id, qty_to_produce, status)
         VALUES ($1,$2,$3,'PENDING')
         ON CONFLICT (order_id, material_id)
         DO UPDATE SET qty_to_produce = EXCLUDED.qty_to_produce, updated_at = now(),
           status = CASE WHEN production_tasks.status = 'DONE' THEN production_tasks.status ELSE 'PENDING' END`,
        [row.order_id, materialId, qtyToProduce]
      )
      await client.query(
        `INSERT INTO production_reservations (order_id, material_id, qty, created_at, updated_at)
         VALUES ($1,$2,$3,now(),now())
         ON CONFLICT (order_id, material_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()`,
        [row.order_id, materialId, qtyToProduce]
      )
    }
    remaining -= alloc
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    const resolvedParams = await params
    const receiptId = Number(String(resolvedParams.id).replace(/\D+/g, ''))
    if (!receiptId) return NextResponse.json({ error: 'id invalido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? '').toLowerCase()
    if (action !== 'post') {
      return NextResponse.json({ error: 'action invalida' }, { status: 400 })
    }
    const autoAllocate = Boolean(body.autoAllocate)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const receiptRes = await client.query<{ status: string; type: string; source_ref: string | null }>(
        'SELECT status, type, source_ref FROM inventory_receipts WHERE id = $1 FOR UPDATE',
        [receiptId]
      )
      if (receiptRes.rowCount === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Recebimento nao encontrado' }, { status: 404 })
      }
      if (receiptRes.rows[0].status !== 'DRAFT') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Recebimento ja postado' }, { status: 400 })
      }
      const receiptType = String(receiptRes.rows[0].type ?? '').toUpperCase()
      const sourceRef = receiptRes.rows[0].source_ref ?? null
      let orderIdForProduction: number | null = null
      if (receiptType === 'PRODUCTION') {
        orderIdForProduction = parseOrderIdFromSourceRef(sourceRef)
        if (!orderIdForProduction && sourceRef) {
          const orderRes = await client.query<{ id: number }>('SELECT id FROM orders WHERE order_number = $1', [sourceRef])
          orderIdForProduction = orderRes.rows[0]?.id ?? null
        }
      }

      const itemsRes = await client.query<{ material_id: number; qty: string | number }>(
        'SELECT material_id, qty FROM inventory_receipt_items WHERE receipt_id = $1',
        [receiptId]
      )
      for (const item of itemsRes.rows) {
        const qty = Number(item.qty ?? 0)
        if (qty <= 0) continue
        const upd = await client.query(
          `UPDATE stock_balances SET on_hand = COALESCE(on_hand,0) + $2, updated_at = now()
           WHERE material_id = $1 RETURNING id`,
          [item.material_id, qty]
        )
        if (upd.rowCount === 0) {
          await client.query(
            `INSERT INTO stock_balances (material_id, on_hand, updated_at) VALUES ($1, $2, now())`,
            [item.material_id, qty]
          )
        }
        if (autoAllocate) {
          await allocateToOrders(client, item.material_id, qty, auth.userId)
        }
        if (receiptType === 'PRODUCTION' && orderIdForProduction) {
          await client.query(
            `DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2`,
            [orderIdForProduction, item.material_id]
          )
        }
      }

      await client.query(
        `UPDATE inventory_receipts
         SET status = 'POSTED', posted_at = now(), posted_by = $2, auto_allocated = $3
         WHERE id = $1`,
        [receiptId, auth.userId, autoAllocate]
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
