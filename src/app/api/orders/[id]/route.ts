import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { isUnauthorizedError, requireAuth } from '@/lib/auth'
import { notifyOrderCompleted } from '@/lib/notifications'
import { invalidateDashboardCache, refreshDashboardSnapshot, revalidateDashboardTag } from '@/lib/repository/dashboard'
import { logActivity } from '@/lib/log-activity'
import { publishRealtimeEvent } from '@/lib/pubsub'

type RouteParams = { id: string }

const RESERVATION_TTL_MS = 5 * 60 * 1000

function parseOrderId(idRaw: string): number {
  return Number(String(idRaw).replace(/^O-/, ''))
}

function parseItemId(idRaw: string): number {
  return Number(String(idRaw).replace(/^itm-/, ''))
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

async function resolveMaterialId(client: import('pg').Pool | import('pg').PoolClient, value: string | number): Promise<number | null> {
  if (typeof value === 'number') return Number(value)
  const raw = String(value).trim()
  if (!raw) return null
  const m = raw.match(/\d+/)
  if (m) return Number(m[0])
  const lookup = await client.query(
    'SELECT id FROM materials WHERE sku = $1 OR name = $1 LIMIT 1',
    [raw]
  )
  return lookup.rowCount > 0 ? Number(lookup.rows[0].id) : null
}

async function upsertReservation(
  client: import('pg').Pool | import('pg').PoolClient,
  orderId: number,
  materialId: number,
  userId: string | null,
  qty: number
) {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString()
  if (qty <= 0) {
    await client.query('DELETE FROM stock_reservations WHERE order_id = $1 AND material_id = $2', [orderId, materialId])
    return
  }
  await client.query(
    `INSERT INTO stock_reservations (order_id, material_id, user_id, qty, expires_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,now(),now())
     ON CONFLICT (order_id, material_id)
     DO UPDATE SET qty = EXCLUDED.qty, user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, updated_at = now()`,
    [orderId, materialId, userId, qty, expiresAt]
  )
}

async function updateProductionTask(
  client: import('pg').Pool | import('pg').PoolClient,
  orderId: number,
  materialId: number,
  qtyToProduce: number
) {
  if (qtyToProduce <= 0) {
    await client.query('DELETE FROM production_tasks WHERE order_id = $1 AND material_id = $2', [orderId, materialId])
    await client.query('DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2', [orderId, materialId])
    return
  }
  await client.query(
    `INSERT INTO production_tasks (order_id, material_id, qty_to_produce, status)
     VALUES ($1,$2,$3,'PENDING')
     ON CONFLICT (order_id, material_id)
     DO UPDATE SET qty_to_produce = EXCLUDED.qty_to_produce,
       status = CASE WHEN production_tasks.status = 'DONE' THEN production_tasks.status ELSE 'PENDING' END,
       updated_at = now()`,
    [orderId, materialId, qtyToProduce]
  )
  await client.query(
    `INSERT INTO production_reservations (order_id, material_id, qty, created_at, updated_at)
     VALUES ($1,$2,$3,now(),now())
     ON CONFLICT (order_id, material_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()`,
    [orderId, materialId, qtyToProduce]
  )
}

async function recalcReservationForItem(
  client: import('pg').Pool | import('pg').PoolClient,
  orderId: number,
  itemId: number,
  userId: string | null
) {
  const itemRes = await client.query(
    `SELECT material_id, quantity, shortage_action
       FROM order_items
       WHERE id = $1 AND order_id = $2`,
    [itemId, orderId]
  )
  if (itemRes.rowCount === 0) return

  const materialId = Number(itemRes.rows[0].material_id)
  const qtyRequested = Number(itemRes.rows[0].quantity ?? 0)
  const shortageAction = String(itemRes.rows[0].shortage_action ?? 'PRODUCE').toUpperCase()

  const balRes = await client.query(
    'SELECT COALESCE(on_hand,0) AS on_hand FROM stock_balances WHERE material_id = $1',
    [materialId]
  )
  const onHand = Number(balRes.rows[0]?.on_hand ?? 0)
  const otherRes = await client.query(
    `SELECT COALESCE(SUM(qty),0) AS reserved
       FROM stock_reservations
       WHERE material_id = $1 AND order_id <> $2 AND expires_at > now()`,
    [materialId, orderId]
  )
  const reservedOther = Number(otherRes.rows[0]?.reserved ?? 0)
  const available = Math.max(0, onHand - reservedOther)
  const qtyReserved = Math.max(0, Math.min(qtyRequested, available))
  const qtyToProduce = shortageAction === 'BUY' ? 0 : Math.max(0, qtyRequested - qtyReserved)

  await client.query(
    `UPDATE order_items
     SET qty_reserved_from_stock = $3, qty_to_produce = $4
     WHERE id = $1 AND order_id = $2`,
    [itemId, orderId, qtyReserved, qtyToProduce]
  )
  await upsertReservation(client, orderId, materialId, userId, qtyReserved)
  await updateProductionTask(client, orderId, materialId, qtyToProduce)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const auth = await requireAuth(request)
    const resolvedParams = await params
    const orderId = parseOrderId(resolvedParams.id)
    if (Number.isNaN(orderId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? '').toLowerCase()

    const client = await getPool().connect()
    try {
      await client.query('BEGIN')

      if (action === 'update_meta') {
        const updates: string[] = []
        const values: unknown[] = []
        if (body.clientId) {
          const clientIdNum = Number(String(body.clientId).replace(/\D+/g, ''))
          updates.push(`client_id = $${values.length + 1}`)
          values.push(clientIdNum)
          const nameRes = await client.query('SELECT name FROM clients WHERE id = $1', [clientIdNum])
          updates.push(`client_name = $${values.length + 1}`)
          values.push(nameRes.rows[0]?.name ?? null)
        }
        if (typeof body.clientName === 'string') {
          updates.push(`client_name = $${values.length + 1}`)
          values.push(body.clientName.trim())
        }
        if (body.dueDate) {
          updates.push(`due_date = $${values.length + 1}`)
          values.push(new Date(body.dueDate))
        }
        if (body.volumeCount !== undefined) {
          updates.push(`volume_count = $${values.length + 1}`)
          values.push(Math.max(1, Number(body.volumeCount)))
        }
        if (updates.length > 0) {
          values.push(orderId)
          await client.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $${values.length}`, values)
        }
      } else if (action === 'update_client') {
        const nextName = typeof body.clientName === 'string' ? body.clientName.trim() : ''
        await client.query('UPDATE orders SET client_name = $2 WHERE id = $1', [orderId, nextName])
      } else if (action === 'add_item') {
        const materialId = await resolveMaterialId(client, body.materialId)
        if (!materialId) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'materialId invalido' }, { status: 400 })
        }
        const descRes = await client.query(
          'SELECT description FROM materials WHERE id = $1',
          [materialId]
        )
        const materialDescription = descRes.rows[0]?.description ?? null
        await client.query(
          `INSERT INTO order_items (order_id, material_id, quantity, unit_price, color, shortage_action, item_description)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orderId, materialId, 0, 0, '', 'PRODUCE', materialDescription]
        )
      } else if (action === 'remove_item') {
        const itemId = parseItemId(body.itemId ?? '')
        if (!itemId) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'itemId invalido' }, { status: 400 })
        }
        const itemRes = await client.query(
          'SELECT material_id FROM order_items WHERE id = $1 AND order_id = $2',
          [itemId, orderId]
        )
        await client.query('DELETE FROM order_items WHERE id = $1 AND order_id = $2', [itemId, orderId])
        if (itemRes.rowCount > 0) {
          const materialId = Number(itemRes.rows[0].material_id)
          await client.query('DELETE FROM stock_reservations WHERE order_id = $1 AND material_id = $2', [orderId, materialId])
          await client.query('DELETE FROM production_tasks WHERE order_id = $1 AND material_id = $2', [orderId, materialId])
          await client.query('DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2', [orderId, materialId])
        }
      } else if (action === 'update_item') {
        const itemId = parseItemId(body.itemId ?? '')
        if (!itemId) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'itemId invalido' }, { status: 400 })
        }
        const updates: string[] = []
        const values: unknown[] = []
        if (body.qtyRequested !== undefined) {
          updates.push(`quantity = $${values.length + 1}`)
          values.push(Math.max(0, Number(body.qtyRequested)))
        }
        if (body.color !== undefined) {
          updates.push(`color = $${values.length + 1}`)
          values.push(String(body.color))
        }
        if (body.shortageAction !== undefined) {
          updates.push(`shortage_action = $${values.length + 1}`)
          values.push(String(body.shortageAction).toUpperCase() === 'BUY' ? 'BUY' : 'PRODUCE')
        }
        if (body.description !== undefined) {
          updates.push(`item_description = $${values.length + 1}`)
          const desc = typeof body.description === 'string' ? body.description.trim() : ''
          values.push(desc.length > 0 ? desc : null)
        }
        if (body.itemCondition !== undefined) {
          updates.push(`item_condition = $${values.length + 1}`)
          values.push(String(body.itemCondition))
        }
        if (body.conditionTemplateName !== undefined) {
          updates.push(`condition_template_name = $${values.length + 1}`)
          values.push(String(body.conditionTemplateName))
        }
        if (updates.length > 0) {
          values.push(itemId, orderId)
          await client.query(`UPDATE order_items SET ${updates.join(', ')} WHERE id = $${values.length - 1} AND order_id = $${values.length}`, values)
        }
        await recalcReservationForItem(client, orderId, itemId, auth.userId)
      } else if (action === 'add_item_condition' || action === 'update_item_condition' || action === 'remove_item_condition') {
        const itemId = parseItemId(body.itemId ?? '')
        if (!itemId) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'itemId invalido' }, { status: 400 })
        }
        const res = await client.query(
          'SELECT conditions FROM order_items WHERE id = $1 AND order_id = $2',
          [itemId, orderId]
        )
        const current = Array.isArray(res.rows[0]?.conditions)
          ? res.rows[0].conditions
          : res.rows[0]?.conditions
            ? JSON.parse(String(res.rows[0].conditions))
            : []
        if (action === 'add_item_condition') {
          current.push({ key: String(body.key ?? ''), value: String(body.value ?? '') })
        } else if (action === 'update_item_condition') {
          const idx = Number(body.index ?? -1)
          if (current[idx]) {
            if (body.key !== undefined) current[idx].key = String(body.key)
            if (body.value !== undefined) current[idx].value = String(body.value)
          }
        } else if (action === 'remove_item_condition') {
          const idx = Number(body.index ?? -1)
          if (idx >= 0 && idx < current.length) current.splice(idx, 1)
        }
        await client.query('UPDATE order_items SET conditions = $3 WHERE id = $1 AND order_id = $2', [
          itemId,
          orderId,
          JSON.stringify(current),
        ])
      } else if (action === 'reserve') {
        const itemId = parseItemId(body.itemId ?? '')
        if (!itemId) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'itemId invalido' }, { status: 400 })
        }
        if (body.qtyRequested !== undefined) {
          await client.query(
            'UPDATE order_items SET quantity = $3 WHERE id = $1 AND order_id = $2',
            [itemId, orderId, Math.max(0, Number(body.qtyRequested))]
          )
        }
        await recalcReservationForItem(client, orderId, itemId, auth.userId)
      } else if (action === 'heartbeat') {
        const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString()
        await client.query(
          'UPDATE stock_reservations SET expires_at = $2, updated_at = now() WHERE order_id = $1',
          [orderId, expiresAt]
        )
      } else if (action === 'update_separated_qty' || action === 'update_separated_weight') {
        const itemId = parseItemId(body.itemId ?? '')
        if (!itemId) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'itemId invalido' }, { status: 400 })
        }
        if (action === 'update_separated_qty') {
          const row = await client.query(
            'SELECT qty_reserved_from_stock FROM order_items WHERE id = $1 AND order_id = $2',
            [itemId, orderId]
          )
          const max = Number(row.rows[0]?.qty_reserved_from_stock ?? 0)
          const next = Math.max(0, Math.min(Number(body.qtySeparated ?? 0), max))
          await client.query('UPDATE order_items SET qty_separated = $3 WHERE id = $1 AND order_id = $2', [
            itemId,
            orderId,
            next,
          ])
        } else {
          await client.query('UPDATE order_items SET separated_weight = $3 WHERE id = $1 AND order_id = $2', [
            itemId,
            orderId,
            Number(body.separatedWeight ?? 0),
          ])
        }
      } else if (action === 'complete_picking') {
        const items = await client.query('SELECT id, material_id, qty_separated, qty_reserved_from_stock, quantity FROM order_items WHERE order_id = $1', [orderId])

        for (const item of items.rows) {
          const qtySeparated = Math.max(0, Number(item.qty_separated ?? 0))
          if (qtySeparated <= 0) continue
          await client.query(
            `UPDATE stock_balances SET on_hand = GREATEST(0, COALESCE(on_hand,0) - $2), updated_at = now()
             WHERE material_id = $1`,
            [item.material_id, qtySeparated]
          )
          const upd = await client.query(
            `UPDATE stock_reservations SET qty = GREATEST(0, qty - $3), updated_at = now()
             WHERE order_id = $1 AND material_id = $2 RETURNING qty`,
            [orderId, item.material_id, qtySeparated]
          )
          if (upd.rowCount > 0 && Number(upd.rows[0].qty ?? 0) <= 0) {
            await client.query('DELETE FROM stock_reservations WHERE order_id = $1 AND material_id = $2', [orderId, item.material_id])
          }
          await client.query(
            `UPDATE order_items
             SET qty_reserved_from_stock = GREATEST(0, qty_reserved_from_stock - $3)
             WHERE id = $1 AND order_id = $2`,
            [item.id, orderId, qtySeparated]
          )
        }

        const allItems = await client.query(
          'SELECT quantity, qty_separated FROM order_items WHERE order_id = $1',
          [orderId]
        )
        const allItemsRows = allItems.rows as { quantity: string | number; qty_separated: string | number }[]
        const allSeparated = allItemsRows.every(
          (row) => Number(row.qty_separated ?? 0) >= Number(row.quantity ?? 0)
        )
        const nextStatus = allSeparated ? 'FINALIZADO' : 'SAIDA_CONCLUIDA'
        await client.query('UPDATE orders SET status = $2, picker_id = $3 WHERE id = $1', [
          orderId,
          nextStatus,
          auth.userId,
        ])
        await client.query(
          `INSERT INTO audit_events (order_id, action, actor, timestamp, details)
           VALUES ($1, $2, $3, now(), $4)`,
          [orderId, 'PICKING_COMPLETED', auth.userId, `Pedido concluido com status ${nextStatus}.`]
        )
        const orderMeta = await client.query(
          'SELECT created_by, order_number FROM orders WHERE id = $1',
          [orderId]
        )
        await notifyOrderCompleted(
          {
            orderId,
            orderNumber: orderMeta.rows[0]?.order_number ?? null,
            status: nextStatus,
            userTarget: orderMeta.rows[0]?.created_by ?? null,
          },
          client
        )
        // Log activity — pick completed
        logActivity(auth.userId, 'PICK_COMPLETED', 'pick', orderId).catch(console.error)
        await publishRealtimeEvent('PICKING_COMPLETED', { orderId })
      } else if (action === 'register_label_print') {
        await client.query('UPDATE orders SET label_print_count = COALESCE(label_print_count,0) + 1 WHERE id = $1', [
          orderId,
        ])
        await client.query(
          `INSERT INTO audit_events (order_id, action, actor, timestamp, details)
           VALUES ($1, $2, $3, now(), $4)`,
          [orderId, 'LABEL_PRINTED', auth.userId, `Etiqueta impressa (${body.format ?? 'EXIT_10x15'}).`]
        )
      } else if (action === 'save_order') {
        await client.query(
          `UPDATE orders
           SET status = CASE WHEN status IN ('draft','rascunho','RASCUNHO') THEN 'ABERTO' ELSE status END
           WHERE id = $1`,
          [orderId]
        )
      } else if (action === 'restore') {
        await client.query('UPDATE orders SET trashed_at = NULL WHERE id = $1', [orderId])
      } else {
        const trashed = Boolean(body.trashed)
        if (trashed) {
          await client.query('UPDATE orders SET trashed_at = NOW(), status = $2 WHERE id = $1', [orderId, 'CANCELADO'])
          await client.query('DELETE FROM production_tasks WHERE order_id = $1', [orderId])
        } else if (body.trashed === false) {
          await client.query('UPDATE orders SET trashed_at = NULL WHERE id = $1', [orderId])
        }
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { })
      throw err
    } finally {
      client.release()
    }

    // Background refresh
    await invalidateDashboardCache()
    await refreshDashboardSnapshot()
    revalidateDashboardTag()

    await publishRealtimeEvent('ORDER_UPDATED', { orderId, action })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('orders PATCH error', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    await requireAuth(request)
    const resolvedParams = await params
    const orderId = parseOrderId(resolvedParams.id)
    if (Number.isNaN(orderId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    await getPool().query('DELETE FROM order_items WHERE order_id = $1', [orderId])
    await getPool().query('DELETE FROM orders WHERE id = $1', [orderId])

    // Background refresh
    await invalidateDashboardCache()
    await refreshDashboardSnapshot()
    revalidateDashboardTag()

    await publishRealtimeEvent('ORDER_DELETED', { orderId })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('orders DELETE error', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
