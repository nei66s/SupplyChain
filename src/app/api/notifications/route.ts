import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { isUnauthorizedError, requireAuth } from '@/lib/auth'

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const url = new URL(request.url)
    const onlyUnread = url.searchParams.get('unread') === '1'
    const clauses: string[] = ['(role_target IS NULL OR role_target = $1 OR user_target = $2)']
    const params: unknown[] = [auth.role, auth.userId]
    if (onlyUnread) clauses.push('read_at IS NULL')

    const res = await getPool().query(
      `SELECT id, type, title, message, created_at, read_at, role_target, user_target, order_id, material_id, dedupe_key
       FROM notifications
       WHERE ${clauses.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    )
    const payload = res.rows.map((row: any) => ({
      id: `N-${row.id}`,
      type: row.type,
      title: row.title,
      message: row.message ?? '',
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      readAt: row.read_at ? (row.read_at instanceof Date ? row.read_at.toISOString() : String(row.read_at)) : undefined,
      roleTarget: row.role_target ?? undefined,
      userTarget: row.user_target ?? undefined,
      orderId: row.order_id ? `O-${row.order_id}` : undefined,
      materialId: row.material_id ? `M-${row.material_id}` : undefined,
      dedupeKey: row.dedupe_key ?? undefined,
    }))
    return NextResponse.json(payload)
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('notifications GET error', err)
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
    await getPool().query('UPDATE notifications SET read_at = $2 WHERE id = $1', [id, read ? new Date() : null])
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('notifications PATCH error', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const url = new URL(request.url)
    const clearAll = url.searchParams.get('all') === '1'

    if (clearAll) {
      await getPool().query(
        'DELETE FROM notifications WHERE (role_target IS NULL OR role_target = $1 OR user_target = $2)',
        [auth.role, auth.userId]
      )
    } else {
      const idStr = url.searchParams.get('id')
      if (idStr) {
        const id = Number(idStr.replace(/\\D+/g, ''))
        await getPool().query(
          'DELETE FROM notifications WHERE id = $1 AND (role_target IS NULL OR role_target = $2 OR user_target = $3)',
          [id, auth.role, auth.userId]
        )
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('notifications DELETE error', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
