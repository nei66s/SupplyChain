import { NextResponse } from 'next/server'
import { RESERVATION_TTL_MS } from '@/lib/domain/types'
import { getPool } from '@/lib/db'
import { notifyAllocationAvailable, notifyOrderProduced } from '@/lib/notifications'
import { postReceipt } from '@/lib/receipt-helpers'
import { logActivity } from '@/lib/log-activity'
import { invalidateDashboardCache, refreshDashboardSnapshot, revalidateDashboardTag } from '@/lib/repository/dashboard'
import { publishRealtimeEvent } from '@/lib/pubsub'

type DbRow = {
  id: number
  order_id: number
  material_id: number
  qty_to_produce: string | number
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE'
  created_at: string
  updated_at: string
  produced_qty?: string | number | null
  produced_weight?: string | number | null
  label_printed: boolean
  order_number: string | null
  material_name: string | null
  order_source: string | null
  order_created_by: string | null
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
    producedQty: row.produced_qty !== null && row.produced_qty !== undefined ? Number(row.produced_qty) : undefined,
    producedWeight: row.produced_weight !== null && row.produced_weight !== undefined ? Number(row.produced_weight) : undefined,
    isMrp: String(row.order_source ?? '').toLowerCase() === 'mrp',
    labelPrinted: row.label_printed,
  }
}

function parseTaskId(id: string): number {
  return Number(String(id).replace(/\D+/g, ''))
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const taskId = parseTaskId(id)
    const payload = await request.json()
    const action = String(payload.action ?? '').toLowerCase()

    if (!taskId) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
    if (action !== 'start' && action !== 'complete' && action !== 'update_produced' && action !== 'register_label_print') {
      return NextResponse.json({ error: 'action inválida' }, { status: 400 })
    }

    if (action === 'update_produced') {
      const producedQty = payload.producedQty !== undefined ? Number(payload.producedQty) : null
      const producedWeight = payload.producedWeight !== undefined ? Number(payload.producedWeight) : null

      const res = await getPool().query(
        `UPDATE production_tasks
         SET produced_qty = $2, produced_weight = $3, updated_at = now()
         WHERE id = $1
         RETURNING id, order_id, material_id, qty_to_produce, status, produced_qty, produced_weight, label_printed, created_at, updated_at,
          (SELECT order_number FROM orders WHERE id = production_tasks.order_id) AS order_number,
          (SELECT source FROM orders WHERE id = production_tasks.order_id) AS order_source,
          (SELECT name FROM materials WHERE id = production_tasks.material_id) AS material_name`,
        [taskId, producedQty, producedWeight]
      )
      if (res.rowCount === 0) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
      return NextResponse.json(toApiTask(res.rows[0]))
    }

    if (action === 'register_label_print') {
      const res = await getPool().query(
        `UPDATE production_tasks
         SET label_printed = true, updated_at = now()
         WHERE id = $1
         RETURNING id, order_id, material_id, qty_to_produce, status, produced_qty, produced_weight, label_printed, created_at, updated_at,
          (SELECT order_number FROM orders WHERE id = production_tasks.order_id) AS order_number,
          (SELECT source FROM orders WHERE id = production_tasks.order_id) AS order_source,
          (SELECT name FROM materials WHERE id = production_tasks.material_id) AS material_name`,
        [taskId]
      )
      if (res.rowCount === 0) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
      return NextResponse.json(toApiTask(res.rows[0]))
    }

    let sql = ''
    if (action === 'start') {
      sql = `
        UPDATE production_tasks
        SET
          status = CASE WHEN status = 'DONE' THEN status ELSE 'IN_PROGRESS' END,
          started_at = CASE WHEN started_at IS NULL AND status != 'DONE' THEN now() ELSE started_at END,
          updated_at = now()
        WHERE id = $1
        RETURNING id, order_id, material_id, qty_to_produce, status, produced_qty, produced_weight, label_printed, created_at, updated_at,
          (SELECT order_number FROM orders WHERE id = production_tasks.order_id) AS order_number,
          (SELECT source FROM orders WHERE id = production_tasks.order_id) AS order_source,
          (SELECT created_by FROM orders WHERE id = production_tasks.order_id) AS order_created_by,
          (SELECT name FROM materials WHERE id = production_tasks.material_id) AS material_name
      `
    } else {
      // For 'complete' we capture qty_to_produce before zeroing it,
      // update task to DONE and set qty_to_produce = 0, then create a DRAFT receipt.
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        const pick = await client.query(
          'SELECT qty_to_produce, produced_qty, material_id, label_printed FROM production_tasks WHERE id = $1 FOR UPDATE',
          [taskId]
        );
        if (pick.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
        }

        const pickRow = pick.rows[0] as { qty_to_produce: string | number; produced_qty: string | number | null; material_id: number; label_printed: boolean } | undefined;
        if (pickRow && !pickRow.label_printed) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'A etiqueta deve ser impressa antes de concluir.' }, { status: 403 });
        }
        let qtyProduced = Number(pickRow?.produced_qty ?? 0);
        if (qtyProduced <= 0) {
          qtyProduced = Number(pickRow?.qty_to_produce ?? 0);
        }
        const materialId = Number(pickRow?.material_id ?? 0);

        const upd = await client.query(
          `UPDATE production_tasks
           SET
             status = 'DONE',
             qty_to_produce = 0,
             completed_at = now(),
             updated_at = now()
           WHERE id = $1
           RETURNING id, order_id, material_id, qty_to_produce, status, produced_qty, produced_weight, label_printed, created_at, updated_at,
          (SELECT order_number FROM orders WHERE id = production_tasks.order_id) AS order_number,
          (SELECT source FROM orders WHERE id = production_tasks.order_id) AS order_source,
          (SELECT created_by FROM orders WHERE id = production_tasks.order_id) AS order_created_by,
          (SELECT name FROM materials WHERE id = production_tasks.material_id) AS material_name`,
          [taskId]
        );

        if (upd.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
        }

        const updRow = upd.rows[0] as DbRow;
        const orderNumber = updRow.order_number ?? `O-${updRow.order_id}`;
        const orderCreatedBy = updRow.order_created_by ?? null;
        const materialName = updRow.material_name ?? `M-${materialId}`;
        const orderId = updRow.order_id;

        if (qtyProduced <= 0) {
          // If nothing was produced, clear any lingering reservation
          await client.query(
            `DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2`,
            [orderId, materialId]
          );
        } else {
          await client.query(
            `DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2`,
            [orderId, materialId]
          );
          const receiptRes = await client.query(
            `INSERT INTO inventory_receipts (type, status, source_ref)
             VALUES ('PRODUCTION', 'DRAFT', $1) RETURNING id`,
            [orderNumber]
          );
          const receiptRow = receiptRes.rows[0] as { id: number } | undefined;
          const receiptId = receiptRow?.id ?? 0;
          await client.query(
            `INSERT INTO inventory_receipt_items (receipt_id, material_id, qty, uom)
             VALUES ($1, $2, $3, (SELECT unit FROM materials WHERE id = $2))`,
            [receiptId, materialId, qtyProduced]
          );
          await postReceipt(client, receiptId, {
            postedBy: null,
            autoAllocate: true,
            productionOrderId: orderId,
          });
          const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();
          await client.query(
            `INSERT INTO stock_reservations (order_id, material_id, user_id, qty, expires_at, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,now(),now())
             ON CONFLICT (order_id, material_id)
             DO UPDATE SET qty = EXCLUDED.qty, user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, updated_at = now()`,
            [orderId, materialId, null, qtyProduced, expiresAt]
          );
          await notifyAllocationAvailable(
            {
              orderId,
              materialId,
              orderNumber,
              materialName,
              qty: qtyProduced,
            },
            client
          );
          await notifyOrderProduced(
            {
              orderId,
              materialId,
              orderNumber,
              materialName,
              qty: qtyProduced,
              userTarget: orderCreatedBy,
            },
            client
          );
        }

        await client.query('COMMIT');

        // Log activity — production completed
        const producedQtyFinal = Number(updRow.produced_qty ?? 0) || qtyProduced;
        const producedWeightFinal = Number(updRow.produced_weight ?? 0) || undefined;
        if (orderCreatedBy) {
          logActivity(orderCreatedBy, 'PRODUCTION_COMPLETED', 'production_task', taskId, producedQtyFinal, producedWeightFinal ?? null).catch(console.error)
        }

        // Invalidate dashboard cache
        await invalidateDashboardCache()
        await refreshDashboardSnapshot()
        revalidateDashboardTag()

        await publishRealtimeEvent('PRODUCTION_COMPLETED', { taskId, orderId })

        return NextResponse.json(toApiTask(updRow));
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    // For 'start' action we execute the prepared SQL, then ensure a production_reservation exists
    const res = await getPool().query(sql, [taskId]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

    const row = res.rows[0] as DbRow;
    const qtyToProduce = Number(row.qty_to_produce ?? 0);
    try {
      if (qtyToProduce > 0) {
        await getPool().query(
          `INSERT INTO production_reservations (order_id, material_id, qty, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (order_id, material_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()`,
          [row.order_id, row.material_id, qtyToProduce]
        );
      } else {
        await getPool().query(`DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2`, [row.order_id, row.material_id]);
      }
    } catch (e) {
      console.error('production reservation upsert error', e);
    }

    // Log activity — production started
    if (row.order_created_by) {
      logActivity(row.order_created_by, 'PRODUCTION_STARTED', 'production_task', taskId, qtyToProduce).catch(console.error)
    }

    await publishRealtimeEvent('PRODUCTION_STARTED', { taskId, orderId: row.order_id })

    return NextResponse.json(toApiTask(row));

    // Note: start action doesn't need dashboard invalidation — no data changes that affect snapshot
  } catch (err: unknown) {
    console.error('production PATCH error', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
