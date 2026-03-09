import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const res = await getPool().query(
      `SELECT id, type, status, source_ref, created_at, posted_at, posted_by, auto_allocated
       FROM inventory_receipts
       ORDER BY created_at DESC`
    )
    const receipts = res.rows.map((row: any) => ({
      id: `IR-${row.id}`,
      type: row.type,
      status: row.status,
      sourceRef: row.source_ref ?? '',
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      postedAt: row.posted_at ? (row.posted_at instanceof Date ? row.posted_at.toISOString() : String(row.posted_at)) : undefined,
      postedBy: row.posted_by ?? undefined,
      autoAllocated: Boolean(row.auto_allocated),
      items: [] as any[],
    }))
    if (receipts.length > 0) {
      const ids = receipts
        .map((r: { id: string }) => Number(String(r.id).replace(/^IR-/, '')))
        .filter((n: number) => !Number.isNaN(n))
      const itemsRes = await getPool().query(
        `SELECT iri.receipt_id, iri.material_id, iri.qty, iri.uom, m.name AS material_name
         FROM inventory_receipt_items iri
         LEFT JOIN materials m ON m.id = iri.material_id
         WHERE iri.receipt_id = ANY($1::int[])`,
        [ids]
      )
      const map = new Map<number, any[]>()
      for (const row of itemsRes.rows) {
        const list = map.get(row.receipt_id) ?? []
        list.push({
          materialId: `M-${row.material_id}`,
          materialName: row.material_name ?? `M-${row.material_id}`,
          qty: Number(row.qty ?? 0),
          uom: row.uom ?? 'EA',
        })
        map.set(row.receipt_id, list)
      }
      for (const receipt of receipts) {
        const rid = Number(String(receipt.id).replace(/^IR-/, ''))
        receipt.items = map.get(rid) ?? []
      }
    }
    return NextResponse.json(receipts)
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
