import { NextResponse } from 'next/server';
import pool from '@/lib/db';

type DbRow = {
  id: number;
  sku: string | null;
  name: string;
  unit: string | null;
  min_stock: number | null;
  reorder_point: number | null;
  setup_time_minutes: number | null;
  production_time_per_unit_minutes: number | null;
  color_options: unknown;
  reserved_total: string | number | null;
  on_hand: string | number | null;
  production_reserved: string | number | null;
};

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query<DbRow>(`
        SELECT
          m.id,
          m.sku,
          m.name,
          m.unit,
          m.min_stock,
          m.reorder_point,
          m.setup_time_minutes,
          m.production_time_per_unit_minutes,
          m.color_options,
          COALESCE((
            SELECT SUM(sr.qty)::NUMERIC(12,4)
            FROM stock_reservations sr
            WHERE sr.material_id = m.id
              AND sr.expires_at > now()
          ),0) AS reserved_total,
          COALESCE((SELECT SUM(qty)::NUMERIC(12,4) FROM production_reservations pr WHERE pr.material_id = m.id), 0) AS production_reserved,
          COALESCE(sb.on_hand,0) AS on_hand
        FROM materials m
        LEFT JOIN stock_balances sb ON sb.material_id = m.id
        GROUP BY m.id, sb.on_hand
        ORDER BY m.id
      `);

      const materials = res.rows.map((r) => ({
        id: `M-${r.id}`,
        name: r.name,
        standardUom: r.unit ?? 'UN',
        minStock: Number(r.min_stock ?? 0),
        reorderPoint: Number(r.reorder_point ?? 0),
        setupTimeMinutes: Number(r.setup_time_minutes ?? 0),
        productionTimePerUnitMinutes: Number(r.production_time_per_unit_minutes ?? 0),
        colorOptions: Array.isArray(r.color_options) ? r.color_options : [],
      }));

      const stockBalances = res.rows.map((r) => ({
        materialId: `M-${r.id}`,
        onHand: Number(r.on_hand ?? 0),
        reservedTotal: Number(r.reserved_total ?? 0),
          productionReserved: Number(r.production_reserved ?? 0),
        }));

      const reservationsRes = await client.query(
        `SELECT sr.id, sr.material_id, sr.order_id, sr.user_id, sr.qty, sr.expires_at, sr.updated_at, sr.created_at, u.name AS user_name
         FROM stock_reservations sr
         LEFT JOIN users u ON u.id = sr.user_id
         WHERE sr.expires_at > now()
         ORDER BY sr.expires_at ASC`
      );

      const stockReservations = reservationsRes.rows.map((row: any) => ({
        id: `SR-${row.id}`,
        materialId: `M-${row.material_id}`,
        orderId: `O-${row.order_id}`,
        userId: row.user_id ?? '',
        userName: row.user_name ?? 'Usuario',
        qty: Number(row.qty ?? 0),
        expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      }));

      const payload = {
        materials,
        stockBalances,
        stockReservations,
      };

      return NextResponse.json(payload);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('inventory API error', err);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
