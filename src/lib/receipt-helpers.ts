import { Pool, PoolClient } from 'pg'
import { RESERVATION_TTL_MS } from '@/lib/domain/types'

type DbClient = Pool | PoolClient

type AllocateClient = DbClient

export function parseOrderIdFromSourceRef(sourceRef?: string | null): number | null {
  if (!sourceRef) return null
  const trimmed = String(sourceRef).trim()
  const match = trimmed.match(/^O-(\d+)$/i)
  if (match) return Number(match[1])
  return null
}

export async function allocateToOrders(
  client: AllocateClient,
  materialId: number,
  qtyAvailable: number,
  userId: string | null,
  tenantId: string
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
       AND o.tenant_id = $2
       AND o.trashed_at IS NULL
       AND (o.status IS NULL OR lower(o.status) NOT IN ('cancelado', 'finalizado', 'rascunho', 'draft'))
     ORDER BY o.created_at ASC`,
    [materialId, tenantId]
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
       WHERE id = $1 AND order_id = $2 AND tenant_id = $5`,
      [row.id, row.order_id, nextReserved, qtyToProduce, tenantId]
    )
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString()
    await client.query(
      `INSERT INTO stock_reservations (order_id, material_id, user_id, qty, expires_at, created_at, updated_at, tenant_id)
       VALUES ($1,$2,$3,$4,$5,now(),now(),$6)
       ON CONFLICT (order_id, material_id)
       DO UPDATE SET qty = EXCLUDED.qty, user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, updated_at = now()`,
      [row.order_id, materialId, userId, nextReserved, expiresAt, tenantId]
    )
    if (qtyToProduce <= 0) {
      await client.query('DELETE FROM production_tasks WHERE order_id = $1 AND material_id = $2 AND tenant_id = $3', [row.order_id, materialId, tenantId])
      await client.query('DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2 AND tenant_id = $3', [row.order_id, materialId, tenantId])
    } else {
      await client.query(
        `INSERT INTO production_tasks (order_id, material_id, qty_to_produce, status, tenant_id)
         VALUES ($1,$2,$3,'PENDING',$4)
         ON CONFLICT (order_id, material_id)
         DO UPDATE SET qty_to_produce = EXCLUDED.qty_to_produce, updated_at = now(),
           status = CASE WHEN production_tasks.status = 'DONE' THEN production_tasks.status ELSE 'PENDING' END`,
        [row.order_id, materialId, qtyToProduce, tenantId]
      )
      await client.query(
        `INSERT INTO production_reservations (order_id, material_id, qty, created_at, updated_at, tenant_id)
         VALUES ($1,$2,$3,now(),now(),$4)
         ON CONFLICT (order_id, material_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()`,
        [row.order_id, materialId, qtyToProduce, tenantId]
      )
    }
    remaining -= alloc
  }
}

export type PostReceiptOptions = {
  postedBy?: string | null
  autoAllocate?: boolean
  productionOrderId?: number | null
  tenantId: string
}

export async function postReceipt(
  client: DbClient,
  receiptId: number,
  options: PostReceiptOptions
): Promise<{ productionOrderId?: number | null }> {
  const { tenantId } = options
  const res = await client.query<{ status: string; type: string; source_ref: string | null }>(
    'SELECT status, type, source_ref FROM inventory_receipts WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
    [receiptId, tenantId]
  )
  if (res.rowCount === 0) {
    throw new Error('Recebimento nao encontrado')
  }
  if (res.rows[0].status !== 'DRAFT') {
    throw new Error('Recebimento ja postado')
  }
  const receiptType = String(res.rows[0].type ?? '').toUpperCase()
  const sourceRef = res.rows[0].source_ref ?? null
  let productionOrderId =
    receiptType === 'PRODUCTION'
      ? options.productionOrderId ?? parseOrderIdFromSourceRef(sourceRef)
      : null
  if (receiptType === 'PRODUCTION' && !productionOrderId && sourceRef) {
    const orderRes = await client.query<{ id: number }>('SELECT id FROM orders WHERE order_number = $1 AND tenant_id = $2', [sourceRef, tenantId])
    productionOrderId = orderRes.rows[0]?.id ?? null
  }

  const itemsRes = await client.query<{ material_id: number; qty: string | number }>(
    'SELECT material_id, qty FROM inventory_receipt_items WHERE receipt_id = $1 AND tenant_id = $2',
    [receiptId, tenantId]
  )
  for (const item of itemsRes.rows) {
    const qty = Number(item.qty ?? 0)
    if (qty <= 0) continue
    const upd = await client.query(
      `UPDATE stock_balances SET on_hand = COALESCE(on_hand,0) + $2, updated_at = now()
       WHERE material_id = $1 AND tenant_id = $3 RETURNING id`,
      [item.material_id, qty, tenantId]
    )
    if (upd.rowCount === 0) {
      await client.query(
        `INSERT INTO stock_balances (material_id, on_hand, updated_at, tenant_id) VALUES ($1, $2, now(), $3)`,
        [item.material_id, qty, tenantId]
      )
    }
    if (options.autoAllocate) {
      await allocateToOrders(client, item.material_id, qty, options.postedBy ?? null, tenantId)
    }
    if (receiptType === 'PRODUCTION' && productionOrderId) {
      await client.query(
        `DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2 AND tenant_id = $3`,
        [productionOrderId, item.material_id, tenantId]
      )
    }
  }

  await client.query(
    `UPDATE inventory_receipts
     SET status = 'POSTED', posted_at = now(), posted_by = $2, auto_allocated = $3
     WHERE id = $1 AND tenant_id = $4`,
    [receiptId, options.postedBy ?? null, Boolean(options.autoAllocate), tenantId]
  )

  return { productionOrderId }
}
