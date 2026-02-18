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
    const url = new URL(request.url)
    const onlyUnread = url.searchParams.get('unread') === '1'

    const res = await pool.query(
      `SELECT id, type, title, message, created_at, read_at, role_target, order_id, material_id, dedupe_key
       FROM notifications
       ${onlyUnread ? 'WHERE read_at IS NULL' : ''}
       ORDER BY created_at DESC`
    )
    const payload = res.rows.map((row: any) => ({
      id: `N-${row.id}`,
      type: row.type,
      title: row.title,
      message: row.message ?? '',
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      readAt: row.read_at ? (row.read_at instanceof Date ? row.read_at.toISOString() : String(row.read_at)) : undefined,
      roleTarget: row.role_target ?? undefined,
      orderId: row.order_id ? `O-${row.order_id}` : undefined,
      materialId: row.material_id ? `M-${row.material_id}` : undefined,
      dedupeKey: row.dedupe_key ?? undefined,
    }))
    return NextResponse.json(payload)
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const id = Number(String(body.id ?? '').replace(/\D+/g, ''))
    if (!id) return NextResponse.json({ error: 'id invalido' }, { status: 400 })
    const read = Boolean(body.read)
    await pool.query('UPDATE notifications SET read_at = $2 WHERE id = $1', [id, read ? new Date() : null])
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
