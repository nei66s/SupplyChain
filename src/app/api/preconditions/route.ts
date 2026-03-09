import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

type PreconditionRow = {
  id: number
  name: string
  values: Array<{ id: number; value: string }>
}

export async function GET() {
  try {
    const result = await getPool().query(
      `SELECT
         c.id,
         c.name,
         COALESCE(
           jsonb_agg(jsonb_build_object('id', v.id, 'value', v.value) ORDER BY v.value) FILTER (WHERE v.id IS NOT NULL),
           '[]'::jsonb
         ) AS values
       FROM precondition_categories c
       LEFT JOIN precondition_values v ON v.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    )
    const rows = (result.rows as PreconditionRow[]) || []
    const categories = rows.map((row) => ({
      id: row.id,
      name: row.name,
      values: Array.isArray(row.values) ? row.values : [],
    }))
    return NextResponse.json(categories)
  } catch (error: any) {
    if (error?.code === '42P01') {
      return NextResponse.json([], { status: 200 })
    }
    return NextResponse.json({ error: error?.message || 'Erro ao carregar pre-condicoes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = String((body?.name ?? '').trim())
    if (!name) {
      return NextResponse.json({ error: 'Nome da categoria e obrigatorio' }, { status: 400 })
    }

    const existing = await getPool().query('SELECT id FROM precondition_categories WHERE lower(name) = lower($1)', [name])
    if (existing.rowCount > 0) {
      return NextResponse.json({ error: 'Categoria ja existe' }, { status: 400 })
    }

    const res = await getPool().query(
      'INSERT INTO precondition_categories (name) VALUES ($1) RETURNING id, name',
      [name]
    )

    return NextResponse.json(res.rows[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar categoria' }, { status: 500 })
  }
}
