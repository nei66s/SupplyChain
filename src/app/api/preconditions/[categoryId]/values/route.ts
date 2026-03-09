import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

type Params = { params: { categoryId: string } }

export async function POST(request: Request, { params }: any) {
  try {
    const categoryId = Number(params.categoryId)
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Categoria invalida' }, { status: 400 })
    }

    const exists = await getPool().query('SELECT id FROM precondition_categories WHERE id = $1', [categoryId])
    if (exists.rowCount === 0) {
      return NextResponse.json({ error: 'Categoria nao encontrada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const value = String((body?.value ?? '').trim())
    if (!value) {
      return NextResponse.json({ error: 'Valor obrigatorio' }, { status: 400 })
    }

    const insert = await getPool().query(
      `INSERT INTO precondition_values (category_id, value)
       VALUES ($1, $2)
       ON CONFLICT (category_id, value) DO NOTHING
       RETURNING id, value`,
      [categoryId, value]
    )

    if (insert.rowCount > 0) {
      return NextResponse.json(insert.rows[0], { status: 201 })
    }

    const existing = await getPool().query(
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
