import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

type PreconditionRow = {
  id: number
  name: string
  values: Array<{ id: number; value: string }>
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const result = await query<PreconditionRow>(
      `SELECT
         c.id,
         c.name,
         COALESCE(
           jsonb_agg(jsonb_build_object('id', v.id, 'value', v.value) ORDER BY v.value) FILTER (WHERE v.id IS NOT NULL),
           '[]'::jsonb
         ) AS values
       FROM precondition_categories c
       LEFT JOIN precondition_values v ON v.category_id = c.id
       WHERE c.tenant_id = $1::uuid
       GROUP BY c.id
       ORDER BY c.name`,
      [auth.tenantId]
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const name = String((body?.name ?? '').trim())
    if (!name) {
      return NextResponse.json({ error: 'Nome da categoria e obrigatorio' }, { status: 400 })
    }

    const existing = await query('SELECT id FROM precondition_categories WHERE lower(name) = lower($1) AND tenant_id = $2', [name, auth.tenantId])
    if (existing.rowCount > 0) {
      return NextResponse.json({ error: 'Categoria ja existe' }, { status: 400 })
    }

    const res = await query(
      'INSERT INTO precondition_categories (name, tenant_id) VALUES ($1, $2) RETURNING id, name',
      [name, auth.tenantId]
    )

    return NextResponse.json(res.rows[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar categoria' }, { status: 500 })
  }
}
