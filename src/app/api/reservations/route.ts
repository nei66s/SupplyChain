import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuth } from '@/lib/auth'

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    // Cleanup expired reservations
    await pool.query('DELETE FROM stock_reservations WHERE expires_at <= now()')

    const res = await pool.query(
      `SELECT
         sr.id,
         sr.material_id,
         sr.order_id,
         sr.user_id,
         sr.qty,
         sr.expires_at,
         sr.updated_at,
         sr.created_at,
         u.name AS user_name,
         o.order_number
       FROM stock_reservations sr
       LEFT JOIN users u ON u.id = sr.user_id
       LEFT JOIN orders o ON o.id = sr.order_id
       ORDER BY sr.expires_at ASC`
    )
    const payload = res.rows.map((row: any) => ({
      id: `SR-${row.id}`,
      materialId: `M-${row.material_id}`,
      orderId: `O-${row.order_id}`,
      userId: row.user_id ?? '',
      userName: row.user_name ?? 'Usuario',
      qty: Number(row.qty ?? 0),
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      orderNumber: row.order_number ?? undefined,
    }))
    return NextResponse.json(payload)
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
