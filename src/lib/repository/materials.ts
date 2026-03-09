import { revalidateTag, unstable_cache } from 'next/cache'
import { query } from '../db'
import { logRepoPerf } from './perf'
import { ConditionVariant, Material, StockBalance } from '../domain/types'

type MaterialStockRow = {
  id: number
  sku: string | null
  name: string
  description: string | null
  unit: string | null
  min_stock: string | number | null
  reorder_point: string | number | null
  setup_time_minutes: string | number | null
  production_time_per_unit_minutes: string | number | null
  color_options: unknown
  metadata: unknown
  reserved_total: string | number | null
  on_hand: string | number | null
}

type ConditionVariantRow = {
  material_id: number
  conditions: unknown
  quantity_requested: string | number | null
  reserved_from_stock: string | number | null
  qty_to_produce: string | number | null
}

const materialSnapshotQuery = `SELECT
  m.id,
  m.sku,
  m.name,
  m.description,
  m.unit,
  m.min_stock,
  m.reorder_point,
  m.setup_time_minutes,
  m.production_time_per_unit_minutes,
  m.color_options,
  m.metadata,
  COALESCE((
    SELECT SUM(sr.qty)::NUMERIC(12,4)
    FROM stock_reservations sr
    WHERE sr.material_id = m.id
      AND sr.expires_at > now()
  ), 0) AS reserved_total,
  COALESCE((SELECT SUM(qty)::NUMERIC(12,4) FROM production_reservations pr WHERE pr.material_id = m.id), 0) AS production_reserved,
  COALESCE(sb.on_hand, 0) AS on_hand
FROM materials m
LEFT JOIN stock_balances sb ON sb.material_id = m.id
GROUP BY m.id, sb.on_hand`

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value as T
}

async function buildMaterialSnapshot(): Promise<{
  materials: Material[];
  stockBalances: StockBalance[];
  conditionVariants: ConditionVariant[];
  queryMs: number;
}> {
  const res = await query<MaterialStockRow>(materialSnapshotQuery)
  const colorMap = res.rows.map((row) => {
    const colorOptionsRaw = parseJson<unknown>(row.color_options, [])
    const metadataRaw = parseJson<Record<string, unknown>>(row.metadata, {})
    const metadata = Object.fromEntries(
      Object.entries(metadataRaw).map(([key, value]) => [key, String(value ?? '')])
    ) as Record<string, string>

    return {
      id: row.id,
      sku: row.sku || undefined,
      name: row.name,
      description: row.description ?? '',
      standardUom: row.unit ?? 'EA',
      minStock: Number(row.min_stock ?? 0),
      reorderPoint: Number(row.reorder_point ?? 0),
      setupTimeMinutes: Number(row.setup_time_minutes ?? 0),
      productionTimePerUnitMinutes: Number(row.production_time_per_unit_minutes ?? 0),
      colorOptions: Array.isArray(colorOptionsRaw)
        ? colorOptionsRaw.map((item) => String(item ?? '')).filter(Boolean)
        : [],
      metadata,
    }
  })

  const materials = colorMap.map((row) => ({
    id: `M-${row.id}`,
    sku: row.sku,
    name: row.name,
    description: row.description,
    standardUom: row.standardUom,
    minStock: row.minStock,
    reorderPoint: row.reorderPoint,
    setupTimeMinutes: row.setupTimeMinutes,
    productionTimePerUnitMinutes: row.productionTimePerUnitMinutes,
    colorOptions: row.colorOptions,
    metadata: row.metadata,
  }))

  const stockBalances = res.rows.map((row) => ({
    materialId: `M-${row.id}`,
    onHand: Number(row.on_hand ?? 0),
    reservedTotal: Number(row.reserved_total ?? 0),
    productionReserved: Number((row as any).production_reserved ?? 0),
  }))

  const variantsRes = await query<ConditionVariantRow>(`
    SELECT
      oi.material_id,
      oi.conditions,
      COALESCE(SUM(oi.quantity)::NUMERIC(12,4), 0) AS quantity_requested,
      COALESCE(SUM(oi.qty_reserved_from_stock)::NUMERIC(12,4), 0) AS reserved_from_stock,
      COALESCE(SUM(oi.qty_to_produce)::NUMERIC(12,4), 0) AS qty_to_produce
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE COALESCE(oi.conditions, '[]'::jsonb) <> '[]'::jsonb
      AND NOT (lower(o.status) IN ('finalizado', 'saida_concluida', 'cancelado'))
    GROUP BY oi.material_id, oi.conditions
    ORDER BY oi.material_id
  `)

  const conditionVariants: ConditionVariant[] = variantsRes.rows.map((row) => ({
    materialId: `M-${row.material_id}`,
    conditions: parseJson<{ key: string; value: string }[]>(row.conditions, []),
    quantityRequested: Number(row.quantity_requested ?? 0),
    reservedFromStock: Number(row.reserved_from_stock ?? 0),
    qtyToProduce: Number(row.qty_to_produce ?? 0),
  }))

  return { materials, stockBalances, conditionVariants, queryMs: res.queryTimeMs }
}

export async function fetchMaterialsWithStock() {
  const totalStart = process.hrtime.bigint()
  const snapshot = await buildMaterialSnapshot()
  const { materials, stockBalances, conditionVariants, queryMs } = snapshot
  const serializationMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000 - queryMs
  const totalMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000
  logRepoPerf('materials:inventorySnapshot', {
    queryMs,
    serializationMs: Math.max(serializationMs, 0),
    totalMs,
    rows: materials.length,
  })
  return { materials, stockBalances, conditionVariants }
}

export const getMaterialsSnapshot = unstable_cache(async () => {
  const snapshot = await buildMaterialSnapshot()
  return {
    materials: snapshot.materials,
    stockBalances: snapshot.stockBalances,
    conditionVariants: snapshot.conditionVariants,
  }
}, ['materials-snapshot'], { revalidate: 30, tags: ['materials'] })

export async function refreshMaterialsSnapshot() {
  revalidateTag('materials')
}
