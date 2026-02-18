import { NextResponse, NextRequest } from 'next/server'
import pool from '@/lib/db'

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const rawId = params?.id
    const id = rawId.startsWith('M-') ? Number(rawId.replace(/^M-/, '')) : Number(rawId)
    if (Number.isNaN(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

    const payload = await request.json()
    // Validation
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

    // If sku provided, ensure uniqueness (allow same as current record)
    if (sku) {
      const exists = await pool.query('SELECT id FROM materials WHERE sku=$1 AND id<>$2', [sku, id])
      if (exists.rowCount > 0) return NextResponse.json({ errors: { sku: 'SKU já em uso' } }, { status: 400 })
    }

    const res = await pool.query(
      `UPDATE materials SET sku=$1, name=$2, description=$3, unit=$4, min_stock=$5, reorder_point=$6, setup_time_minutes=$7, production_time_per_unit_minutes=$8, color_options=$9
       WHERE id=$10 RETURNING id, sku, name, description, unit, min_stock, reorder_point, setup_time_minutes, production_time_per_unit_minutes, color_options`,
      [sku || null, name, payload.description || null, standardUom, minStock, reorderPoint, setupTimeMinutes, productionTimePerUnitMinutes, JSON.stringify(colorOptions || []), id]
    )

    if (res.rowCount === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })

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

    return NextResponse.json(material)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const rawId = params?.id
    const id = rawId.startsWith('M-') ? Number(rawId.replace(/^M-/, '')) : Number(rawId)
    if (Number.isNaN(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

    const res = await pool.query('DELETE FROM materials WHERE id=$1', [id])
    if (res.rowCount === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
