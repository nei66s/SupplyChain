import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import {
  notifyAllocationAvailable,
  notifyOrderStage,
  notifyProductionTaskCreated,
} from '@/lib/notifications'
import { logActivity } from '@/lib/log-activity'
import { invalidateDashboardCache, refreshDashboardSnapshot, revalidateDashboardTag } from '@/lib/repository/dashboard'
import { publishRealtimeEvent } from '@/lib/pubsub'

type ItemPayload = {
  materialId: number
  quantity: number
  unitPrice?: number
  shortageAction?: 'PRODUCE' | 'BUY'
  description?: string | null
  conditions?: { key: string; value: string }[]
}

type MaterialLookupRow = { id: number }
type MaterialDescriptionRow = { description: string | null }
type OrderIdRow = { id: number }
type CreatedOrderItemRow = {
  order_number: string | null
  status: string | null
  total: string | number | null
  created_at: string | null
  item_id: number | null
  material_id: number | null
  sku: string | null
  material_name: string | null
  quantity: string | number | null
  unit_price: string | number | null
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const payload = await request.json()
    const rawItems: unknown[] = Array.isArray(payload.items) ? payload.items : []

    // Normalize materialId (accept numbers, 'M-1', SKU strings)
    const items: ItemPayload[] = []
    const errors: Record<string, string> = {}

    for (let idx = 0; idx < rawItems.length; idx++) {
      const it = rawItems[idx] as {
        materialId?: number | string;
        quantity?: number | string;
        unitPrice?: number | string;
        shortageAction?: 'PRODUCE' | 'BUY' | string
        description?: string
      }
      let materialIdNum: number | null = null

      if (typeof it.materialId === 'number') materialIdNum = Number(it.materialId)
      else if (typeof it.materialId === 'string') {
        const m = it.materialId.match(/\d+/)
        if (m) materialIdNum = Number(m[0])
        // if still null, try lookup by sku or exact id string
        if (!materialIdNum) {
          try {
            const r = await getPool().query('SELECT id FROM materials WHERE sku=$1 OR name=$1 LIMIT 1', [it.materialId])
            if (r.rowCount > 0) {
              const lookupRow = r.rows[0] as MaterialLookupRow
              materialIdNum = Number(lookupRow.id)
            }
          } catch { }
        }
      }

      const qty = Number(it.quantity)
      const unitPrice = Number(it.unitPrice ?? 0)
      const shortageAction: 'PRODUCE' | 'BUY' = String(it.shortageAction ?? 'PRODUCE').toUpperCase() === 'BUY' ? 'BUY' : 'PRODUCE'
      const descriptionValue = typeof it.description === 'string' ? it.description.trim() : ''
      const normalizedDescription = descriptionValue.length > 0 ? descriptionValue : null

      if (!materialIdNum) errors[`items[${idx}].materialId`] = 'materialId é obrigatório'
      if (Number.isNaN(qty) || qty <= 0) errors[`items[${idx}].quantity`] = 'Quantidade inválida'
      if (Number.isNaN(unitPrice) || unitPrice < 0) errors[`items[${idx}].unitPrice`] = 'Preço unitário inválido'

      items.push({ materialId: materialIdNum ?? 0, quantity: qty, unitPrice, shortageAction, description: normalizedDescription })
    }

    if (rawItems.length === 0) errors.items = 'Pedido deve conter pelo menos um item'

    if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 })

    let total = 0
    for (const it of items) total += Number(it.quantity) * Number(it.unitPrice ?? 0)

    const client = await getPool().connect()
    const orderCreatorId = auth.userId
    const pendingProductionNotifications: { materialId: number; qty: number }[] = []
    const pendingAllocationNotifications: { materialId: number; qty: number }[] = []
    const notificationMaterialIds = new Set<number>()
    try {
      await client.query('BEGIN')
      const orderRes = await client.query(
        'INSERT INTO orders (status, total, created_by, client_name, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING id, status, total, created_at',
        [payload.status ?? 'draft', total, auth.userId, payload.clientName ?? null, payload.dueDate ? new Date(payload.dueDate) : null]
      )
      const orderId = orderRes.rows[0].id

      const materialDescriptionCache = new Map<number, string | null>()
      const resolveMaterialDescription = async (materialId: number) => {
        if (!materialDescriptionCache.has(materialId)) {
          const matRes = await client.query('SELECT description FROM materials WHERE id = $1', [materialId])
          const matRow = matRes.rows[0] as MaterialDescriptionRow | undefined
          materialDescriptionCache.set(materialId, matRow?.description ?? null)
        }
        return materialDescriptionCache.get(materialId) ?? null
      }

      for (const it of items) {
        const description = it.description ?? (await resolveMaterialDescription(it.materialId))
        await client.query(
          'INSERT INTO order_items (order_id, material_id, quantity, unit_price, conditions, shortage_action, item_description) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [orderId, it.materialId, Number(it.quantity), Number(it.unitPrice ?? 0), JSON.stringify(it.conditions ?? []), it.shortageAction ?? 'PRODUCE', description]
        )
      }

      // Create production tasks from shortage only when shortageAction is PRODUCE.
      await client.query('DELETE FROM production_tasks WHERE order_id = $1', [orderId])

      const requestedToProduceByMaterial = new Map<number, number>()
      for (const it of items) {
        if ((it.shortageAction ?? 'PRODUCE') !== 'PRODUCE') continue
        requestedToProduceByMaterial.set(
          it.materialId,
          (requestedToProduceByMaterial.get(it.materialId) ?? 0) + Number(it.quantity)
        )
      }

      for (const [materialId, requestedQty] of requestedToProduceByMaterial.entries()) {
        const availableRes = await client.query(
          `WITH others_requested AS (
             SELECT COALESCE(SUM(oi.quantity), 0)::NUMERIC(12,4) AS qty
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.material_id = $1
               AND oi.order_id <> $2
               AND (o.status IS NULL OR lower(o.status) NOT IN ('finalizado', 'cancelado', 'draft'))
           ),
           others_to_produce AS (
             SELECT COALESCE(SUM(pt.qty_to_produce), 0)::NUMERIC(12,4) AS qty
             FROM production_tasks pt
             JOIN orders o ON o.id = pt.order_id
             WHERE pt.material_id = $1
               AND pt.order_id <> $2
               AND pt.status <> 'DONE'
               AND (o.status IS NULL OR lower(o.status) NOT IN ('finalizado', 'cancelado', 'draft'))
           )
           SELECT
             GREATEST(
               0::NUMERIC,
               COALESCE(sb.on_hand, 0)::NUMERIC - GREATEST(
                 0::NUMERIC,
                 (SELECT qty FROM others_requested) - (SELECT qty FROM others_to_produce)
               )
             ) AS available
           FROM materials m
           LEFT JOIN stock_balances sb ON sb.material_id = m.id
           WHERE m.id = $1`,
          [materialId, orderId]
        )
        const availableRow = availableRes.rows[0] as { available: string | number } | undefined
        const available = Number(availableRow?.available ?? 0)
        const qtyToProduce = Math.max(0, Number(requestedQty) - available)
        if (qtyToProduce <= 0) continue

        await client.query(
          `INSERT INTO production_tasks (order_id, material_id, qty_to_produce, status)
           VALUES ($1, $2, $3, 'PENDING')
           ON CONFLICT (order_id, material_id)
           DO UPDATE SET qty_to_produce = EXCLUDED.qty_to_produce, status = 'PENDING', updated_at = now()`,
          [orderId, materialId, qtyToProduce]
        )
        // Create a production reservation tied to this order so the produced qty is earmarked
        await client.query(
          `INSERT INTO production_reservations (order_id, material_id, qty, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (order_id, material_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()`,
          [orderId, materialId, qtyToProduce]
        )
        pendingProductionNotifications.push({ materialId, qty: qtyToProduce })
        notificationMaterialIds.add(materialId)
      }

      // compute daily sequence for orderNumber (transactional, then persist)
      const createdAtInserted = orderRes.rows[0].created_at ?? new Date().toISOString()
      const dateStr = new Date(createdAtInserted).toISOString().slice(0, 10) // YYYY-MM-DD
      const dateKey = dateStr.replace(/-/g, '') // YYYYMMDD
      const sameDayRes = await client.query('SELECT id FROM orders WHERE created_at::date = $1::date ORDER BY created_at ASC', [dateStr])
      const sameDayRows = sameDayRes.rows as OrderIdRow[]
      const ids = sameDayRows.map((r) => Number(r.id))
      const pos = ids.indexOf(orderId)
      const seq = pos >= 0 ? (pos + 1) : (ids.length)
      const orderNumber = `${dateKey}${String(seq).padStart(2, '0')}`

      await client.query('UPDATE orders SET order_number = $1 WHERE id = $2', [orderNumber, orderId])

      // Update order_items with reserved/produce quantities and create stock reservations
      const orderItemsRes = await client.query(
        'SELECT id, material_id, quantity, shortage_action FROM order_items WHERE order_id = $1',
        [orderId]
      )
      const orderItemRows = orderItemsRes.rows as { id: number; material_id: number; quantity: string | number; shortage_action: string | null }[]
      for (const row of orderItemRows) {
        const requested = Number(row.quantity ?? 0)
        const shortageAction = String(row.shortage_action ?? 'PRODUCE').toUpperCase()
        const availableRes = await client.query(
          `SELECT COALESCE(sb.on_hand,0) AS available
           FROM materials m
           LEFT JOIN stock_balances sb ON sb.material_id = m.id
           WHERE m.id = $1`,
          [row.material_id]
        )
        const availableRow = availableRes.rows[0] as { available: string | number } | undefined
        const available = Number(availableRow?.available ?? 0)
        const qtyReserved = Math.max(0, Math.min(requested, available))
        const qtyToProduce = shortageAction === 'BUY' ? 0 : Math.max(0, requested - qtyReserved)
        await client.query(
          'UPDATE order_items SET qty_reserved_from_stock = $3, qty_to_produce = $4 WHERE id = $1',
          [row.id, qtyReserved, qtyToProduce]
        )
        if (qtyReserved > 0) {
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
          await client.query(
            `INSERT INTO stock_reservations (order_id, material_id, user_id, qty, expires_at, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,now(),now())
             ON CONFLICT (order_id, material_id)
             DO UPDATE SET qty = EXCLUDED.qty, user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, updated_at = now()`,
            [orderId, row.material_id, auth.userId, qtyReserved, expiresAt]
          )
          pendingAllocationNotifications.push({ materialId: row.material_id, qty: qtyReserved })
          notificationMaterialIds.add(row.material_id)
        }
      }

      const materialNames = new Map<number, string>()
      if (notificationMaterialIds.size > 0) {
        const materialsRes = await client.query(
          'SELECT id, name FROM materials WHERE id = ANY($1::int[])',
          [[...notificationMaterialIds]]
        )
        for (const row of materialsRes.rows as { id: number; name: string | null }[]) {
          materialNames.set(row.id, row.name ?? `M-${row.id}`)
        }
      }
      for (const entry of pendingProductionNotifications) {
        const name = materialNames.get(entry.materialId) ?? `M-${entry.materialId}`
        await notifyProductionTaskCreated(
          {
            orderId,
            materialId: entry.materialId,
            orderNumber,
            materialName: name,
            qty: entry.qty,
          },
          client
        )
      }
      for (const entry of pendingAllocationNotifications) {
        const name = materialNames.get(entry.materialId) ?? `M-${entry.materialId}`
        await notifyAllocationAvailable(
          {
            orderId,
            materialId: entry.materialId,
            orderNumber,
            materialName: name,
            qty: entry.qty,
          },
          client
        )
      }
      if (pendingProductionNotifications.length > 0) {
        await notifyOrderStage(
          {
            orderId,
            orderNumber,
            stage: 'PRODUCAO_INICIADA',
            userTarget: orderCreatorId,
            detail: `Pedido ${orderNumber} iniciou a produção de ${pendingProductionNotifications.length} material(is).`,
          },
          client
        )
      }
      await client.query('COMMIT')

      // Invalidate dashboard cache
      await invalidateDashboardCache()
      await refreshDashboardSnapshot()
      revalidateDashboardTag()

      await publishRealtimeEvent('ORDER_SUBMITTED', { orderId })

      // Log activity — order created with items
      logActivity(auth.userId, 'ORDER_CREATED', 'order', orderId, items.length).catch(console.error)

      // Fetch created order and items
      const createdRes = await getPool().query(
        `SELECT o.id, o.order_number, o.status, o.total, o.created_at, oi.id AS item_id, oi.material_id, oi.conditions, m.sku, m.name AS material_name, oi.quantity, oi.unit_price
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN materials m ON m.id = oi.material_id
         WHERE o.id = $1`,
        [orderId]
      )

      const rows = (createdRes.rows as CreatedOrderItemRow[]) || []
      const createdAt = rows[0]?.created_at ?? createdAtInserted

      // compute daily sequence for orderNumber
      const order = {
        id: `O-${orderId}`,
        orderNumber: createdRes.rows[0]?.order_number ?? `${new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, '')}${String(1).padStart(2, '0')}`,
        status: rows[0]?.status ?? (payload.status ?? 'draft'),
        total: Number(rows[0]?.total ?? total),
        createdAt: createdAt,
        items: rows.filter((r) => r.item_id).map((r) => ({
          id: r.item_id,
          materialId: r.material_id,
          materialSku: r.sku,
          materialName: r.material_name,
          quantity: Number(r.quantity),
          unitPrice: Number(r.unit_price),
          conditions: Array.isArray((r as any).conditions) ? (r as any).conditions : ((r as any).conditions ? JSON.parse(String((r as any).conditions)) : [])
        }))
      }

      return NextResponse.json(order, { status: 201 })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { })
      throw err
    } finally {
      client.release()
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
