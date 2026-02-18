import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const res = await pool.query(
      `SELECT id, sku, name, description, unit, min_stock, reorder_point, setup_time_minutes, production_time_per_unit_minutes, color_options, metadata
       FROM materials ORDER BY id`
    )
    const rows = res.rows || []
    const materials = rows.map((r: any) => ({
      id: `M-${r.id}`,
      sku: r.sku,
      name: r.name,
      description: r.description,
      standardUom: r.unit || 'EA',
      minStock: Number(r.min_stock ?? 0),
      reorderPoint: Number(r.reorder_point ?? 0),
      setupTimeMinutes: Number(r.setup_time_minutes ?? 0),
      productionTimePerUnitMinutes: Number(r.production_time_per_unit_minutes ?? 0),
      colorOptions: Array.isArray(r.color_options) ? r.color_options : (r.color_options ? JSON.parse(r.color_options) : []),
      metadata: (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) || {},
    }))

    return NextResponse.json(materials)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    // Basic validation
    const errors: Record<string, string> = {}
    const name = String(payload.name ?? '').trim()
    if (!name) errors.name = 'Nome é obrigatório'

    const standardUom = String(payload.standardUom ?? 'EA').trim() || 'EA'

    const minStock = Number(payload.minStock ?? 0)
    const reorderPoint = Number(payload.reorderPoint ?? 0)
    const setupTimeMinutes = Number(payload.setupTimeMinutes ?? 0)
    const productionTimePerUnitMinutes = Number(payload.productionTimePerUnitMinutes ?? 0)

    if (Number.isNaN(minStock) || minStock < 0) errors.minStock = 'Estoque mínimo inválido'
    if (Number.isNaN(reorderPoint) || reorderPoint < 0) errors.reorderPoint = 'Ponto de pedido inválido'
    if (Number.isNaN(setupTimeMinutes) || setupTimeMinutes < 0) errors.setupTimeMinutes = 'Tempo de preparação inválido'
    if (Number.isNaN(productionTimePerUnitMinutes) || productionTimePerUnitMinutes < 0) errors.productionTimePerUnitMinutes = 'Tempo de produção inválido'

    let colorOptions: string[] = []
    if (Array.isArray(payload.colorOptions)) colorOptions = payload.colorOptions.map(String)
    else if (typeof payload.colorOptions === 'string') colorOptions = payload.colorOptions.split(',').map((s: string) => s.trim()).filter(Boolean)

    const sku = payload.sku ? String(payload.sku).trim() : null
    if (sku && !/^[A-Z0-9\-]+$/i.test(sku)) errors.sku = 'SKU inválido (apenas letras, números e traços)'

    if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 })

    // If sku provided, ensure uniqueness
    if (sku) {
      const exists = await pool.query('SELECT id FROM materials WHERE sku=$1', [sku])
      if (exists.rowCount > 0) return NextResponse.json({ errors: { sku: 'SKU já em uso' } }, { status: 400 })
    }

    let res
    if (sku) {
      res = await pool.query(
        `INSERT INTO materials (sku, name, description, unit, min_stock, reorder_point, setup_time_minutes, production_time_per_unit_minutes, color_options)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, sku, name, description, unit, min_stock, reorder_point, setup_time_minutes, production_time_per_unit_minutes, color_options`,
        [sku, name, payload.description || null, standardUom, minStock, reorderPoint, setupTimeMinutes, productionTimePerUnitMinutes, JSON.stringify(colorOptions || [])]
      )
    } else {
      // generate a SKU using the next id from the materials sequence so we can satisfy NOT NULL/UNIQUE
      res = await pool.query(
        `WITH next_id AS (SELECT nextval(pg_get_serial_sequence('materials','id')) AS nid)
         INSERT INTO materials (id, sku, name, description, unit, min_stock, reorder_point, setup_time_minutes, production_time_per_unit_minutes, color_options)
         SELECT nid, ('MAT-' || lpad(nid::text, 3, '0'))::text, $1, $2, $3, $4, $5, $6, $7, $8 FROM next_id
         RETURNING id, sku, name, description, unit, min_stock, reorder_point, setup_time_minutes, production_time_per_unit_minutes, color_options`,
        [name, payload.description || null, standardUom, minStock, reorderPoint, setupTimeMinutes, productionTimePerUnitMinutes, JSON.stringify(colorOptions || [])]
      )
    }
    const row = res.rows[0]

    const material = {
      id: `M-${row.id}`,
      sku: row.sku,
      name: row.name,
      description: row.description,
      standardUom: row.unit || 'EA',
      minStock: Number(row.min_stock ?? 0),
      reorderPoint: Number(row.reorder_point ?? 0),
      setupTimeMinutes: Number(row.setup_time_minutes ?? 0),
      productionTimePerUnitMinutes: Number(row.production_time_per_unit_minutes ?? 0),
      colorOptions: Array.isArray(row.color_options) ? row.color_options : (row.color_options ? JSON.parse(row.color_options) : []),
    }

    return NextResponse.json(material, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
