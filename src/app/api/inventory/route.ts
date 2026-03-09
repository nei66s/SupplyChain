import { NextRequest, NextResponse } from 'next/server';
import { getInventorySnapshot, refreshInventorySnapshot } from '@/lib/repository/inventory';
import { getPool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { invalidateDashboardCache, refreshDashboardSnapshot, revalidateDashboardTag } from '@/lib/repository/dashboard';
import { publishRealtimeEvent } from '@/lib/pubsub';

export async function GET() {
  try {
    const snapshot = await getInventorySnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error('inventory API error', err);
    return new NextResponse(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const { materialId, onHand, reason } = body;

    if (!materialId || onHand === undefined || !reason) {
      return NextResponse.json({ error: 'Faltam dados: materialId, onHand e reason são obrigatórios.' }, { status: 400 });
    }

    const mid = Number(String(materialId).replace(/\D+/g, ''));
    const nextQty = Number(onHand);

    if (isNaN(nextQty)) {
      return NextResponse.json({ error: 'Quantidade inválida.' }, { status: 400 });
    }

    console.log(`[inventory:adjust] material=${mid} nextQty=${nextQty} actor=${auth.userId} reason="${reason}"`);

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current qty
      const currentRes = await client.query('SELECT on_hand FROM stock_balances WHERE material_id = $1', [mid]);
      const qtyBefore = Number(currentRes.rows[0]?.on_hand ?? 0);
      const adjustmentQty = nextQty - qtyBefore;

      // Update stock_balances
      await client.query(
        `INSERT INTO stock_balances (material_id, on_hand, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (material_id) DO UPDATE SET on_hand = EXCLUDED.on_hand, updated_at = now()`,
        [mid, nextQty]
      );

      // Record adjustment
      await client.query(
        `INSERT INTO inventory_adjustments (material_id, qty_before, qty_after, adjustment_qty, reason, actor, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [mid, qtyBefore, nextQty, adjustmentQty, reason, auth.userId]
      );

      await client.query('COMMIT');

      // Bust the cache for materials snapshot
      await refreshInventorySnapshot();

      // Invalidate dashboard cache
      await invalidateDashboardCache()
      await refreshDashboardSnapshot()
      revalidateDashboardTag()

      await publishRealtimeEvent('INVENTORY_ADJUSTED', { materialId: mid, nextQty })
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('inventory POST error', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
