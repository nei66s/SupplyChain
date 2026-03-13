import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'



export async function POST(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const auth = await requireAuth(request)
    const resolvedParams = await params
    const categoryId = Number(resolvedParams.categoryId)
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Categoria invalida' }, { status: 400 })
    }

    const exists = await query('SELECT id FROM precondition_categories WHERE id = $1', [categoryId])
    if (exists.rowCount === 0) {
      return NextResponse.json({ error: 'Categoria nao encontrada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const value = String((body?.value ?? '').trim())
    if (!value) {
      return NextResponse.json({ error: 'Valor obrigatorio' }, { status: 400 })
    }

    const insert = await query(
      `INSERT INTO precondition_values (category_id, value, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (category_id, value) DO NOTHING
       RETURNING id, value`,
      [categoryId, value, auth.tenantId]
    )

    if (insert.rowCount > 0) {
      return NextResponse.json(insert.rows[0], { status: 201 })
    }

    const existing = await query(
      'SELECT id, value FROM precondition_values WHERE category_id = $1 AND value = $2',
      [categoryId, value]
    )

    if (existing.rowCount > 0) {
      return NextResponse.json(existing.rows[0])
    }

    return NextResponse.json({ error: 'Nao foi possivel adicionar o valor' }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao adicionar valor' }, { status: 500 })
  }
}
