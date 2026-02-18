import { NextResponse } from 'next/server'
import pool from '@/lib/db'

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
    if (action !== 'start' && action !== 'complete') {
      return NextResponse.json({ error: 'action deve ser start ou complete' }, { status: 400 })
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
        RETURNING id, order_id, material_id, qty_to_produce, status, created_at, updated_at,
          (SELECT order_number FROM orders WHERE id = production_tasks.order_id) AS order_number,
          (SELECT source FROM orders WHERE id = production_tasks.order_id) AS order_source,
          (SELECT name FROM materials WHERE id = production_tasks.material_id) AS material_name
      `
    } else {
      // For 'complete' we capture qty_to_produce before zeroing it,
      // update task to DONE and set qty_to_produce = 0, then create a DRAFT receipt.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const pick = await client.query<{ qty_to_produce: string | number; material_id: number }>(
          'SELECT qty_to_produce, material_id FROM production_tasks WHERE id = $1 FOR UPDATE',
          [taskId]
        );
        if (pick.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
        }

        const qtyProduced = Number(pick.rows[0].qty_to_produce ?? 0);
        const materialId = Number(pick.rows[0].material_id);

        const upd = await client.query<DbRow>(
          `UPDATE production_tasks
           SET
             status = 'DONE',
             qty_to_produce = 0,
             completed_at = now(),
             updated_at = now()
           WHERE id = $1
           RETURNING id, order_id, material_id, qty_to_produce, status, created_at, updated_at,
             (SELECT order_number FROM orders WHERE id = production_tasks.order_id) AS order_number,
             (SELECT source FROM orders WHERE id = production_tasks.order_id) AS order_source,
             (SELECT name FROM materials WHERE id = production_tasks.material_id) AS material_name`,
          [taskId]
        );

        if (qtyProduced <= 0) {
          // If nothing was produced, clear any lingering reservation
          await client.query(
            `DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2`,
            [upd.rows[0].order_id, materialId]
          );
        }

        // Create inventory receipt draft for produced qty
        if (qtyProduced > 0) {
          const receiptRes = await client.query<{ id: number }>(
            `INSERT INTO inventory_receipts (type, status, source_ref)
             VALUES ('PRODUCTION', 'DRAFT', $1) RETURNING id`,
            [upd.rows[0].order_number ?? `O-${upd.rows[0].order_id}`]
          );
          const receiptId = receiptRes.rows[0].id;
          await client.query(
            `INSERT INTO inventory_receipt_items (receipt_id, material_id, qty, uom)
             VALUES ($1, $2, $3, (SELECT unit FROM materials WHERE id = $2))`,
            [receiptId, materialId, qtyProduced]
          );
        }

        await client.query('COMMIT');
        return NextResponse.json(toApiTask(upd.rows[0]));
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    // For 'start' action we execute the prepared SQL, then ensure a production_reservation exists
    const res = await pool.query<DbRow>(sql, [taskId]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });

    const row = res.rows[0];
    const qtyToProduce = Number(row.qty_to_produce ?? 0);
    try {
      if (qtyToProduce > 0) {
        await pool.query(
          `INSERT INTO production_reservations (order_id, material_id, qty, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (order_id, material_id) DO UPDATE SET qty = EXCLUDED.qty, updated_at = now()`,
          [row.order_id, row.material_id, qtyToProduce]
        );
      } else {
        await pool.query(`DELETE FROM production_reservations WHERE order_id = $1 AND material_id = $2`, [row.order_id, row.material_id]);
      }
    } catch (e) {
      console.error('production reservation upsert error', e);
    }

    return NextResponse.json(toApiTask(row));
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
