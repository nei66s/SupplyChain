import { unstable_cache } from 'next/cache'
import { query } from '../db'
import { logRepoPerf } from './perf'

type PreconditionCategoryRow = {
  id: number
  name: string
  values: Array<{ id: number; value: string }>
}

export type PreconditionCategory = {
  id: number
  name: string
  values: Array<{ id: number; value: string }>
}

const preconditionsListQuery = `SELECT
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

export async function listPreconditionCategories(): Promise<PreconditionCategory[]> {
  const start = process.hrtime.bigint()
  const res = await query<PreconditionCategoryRow>(preconditionsListQuery)
  const categories = res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    values: Array.isArray(row.values) ? row.values : [],
  }))
  const totalMs = Number(process.hrtime.bigint() - start) / 1_000_000
  logRepoPerf('preconditions:list', {
    queryMs: res.queryTimeMs,
    serializationMs: Math.max(totalMs - res.queryTimeMs, 0),
    totalMs,
    rows: categories.length,
  })
  return categories
}

export async function createPreconditionCategory(name: string) {
  const res = await query<{ id: number; name: string }>(
    'INSERT INTO precondition_categories (name) VALUES ($1) RETURNING id, name',
    [name]
  )
  return res.rows[0] ?? null
}

export async function addPreconditionValue(categoryId: number, value: string) {
  const res = await query<{ id: number; value: string }>(
    `INSERT INTO precondition_values (category_id, value)
     VALUES ($1, $2)
     ON CONFLICT (category_id, value) DO NOTHING
     RETURNING id, value`,
    [categoryId, value]
  )
  if (res.rowCount > 0) return res.rows[0]

  const existing = await query<{ id: number; value: string }>(
    'SELECT id, value FROM precondition_values WHERE category_id = $1 AND value = $2',
    [categoryId, value]
  )
  return existing.rows[0] ?? null
}

export const getPreconditionCategories = unstable_cache(
  async () => listPreconditionCategories(),
  [],
  { revalidate: 180 }
)

export async function refreshPreconditionCategories() {
  await (getPreconditionCategories as any).revalidate()
}
