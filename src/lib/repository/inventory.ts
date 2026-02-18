import { getMaterialsSnapshot, refreshMaterialsSnapshot } from './materials'
import { query } from '../db'
import { Material, StockBalance, StockReservation } from '../domain/types'

export type InventorySnapshot = {
  materials: Material[]
  stockBalances: StockBalance[]
  stockReservations: StockReservation[]
}

export async function getInventorySnapshot(): Promise<InventorySnapshot> {
  const { materials, stockBalances } = await getMaterialsSnapshot()
  const reservationsRes = await query(`
    SELECT sr.id, sr.material_id, sr.order_id, sr.user_id, sr.qty, sr.expires_at, sr.updated_at, sr.created_at, u.name AS user_name
    FROM stock_reservations sr
    LEFT JOIN users u ON u.id = sr.user_id
    WHERE sr.expires_at > now()
    ORDER BY sr.expires_at ASC
  `)
  const stockReservations = reservationsRes.rows.map((row: any) => ({
    id: `SR-${row.id}`,
    materialId: `M-${row.material_id}`,
    orderId: `O-${row.order_id}`,
    userId: row.user_id ?? '',
    userName: row.user_name ?? 'Usuario',
    qty: Number(row.qty ?? 0),
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }))
  return {
    materials,
    stockBalances,
    stockReservations,
  }
}

export async function refreshInventorySnapshot(): Promise<void> {
  await refreshMaterialsSnapshot()
}
