import { query } from '../db'
import { logRepoPerf } from './perf'
import { Order, OrderItem, OrderStatus } from '../domain/types'

const statusMap: Record<string, OrderStatus> = {
  draft: 'RASCUNHO',
  rascunho: 'RASCUNHO',
  aberto: 'ABERTO',
  em_picking: 'EM_PICKING',
  'em picking': 'EM_PICKING',
  'em-picking': 'EM_PICKING',
  'saida finalizada': 'SAIDA_CONCLUIDA',
  saida_concluida: 'SAIDA_CONCLUIDA',
  'saida-concluida': 'SAIDA_CONCLUIDA',
  finalizado: 'FINALIZADO',
  cancelado: 'CANCELADO',
}

function normalizeStatus(status?: string | null): OrderStatus {
  if (!status) return 'ABERTO'
  const normalized = String(status).trim().toLowerCase()
  return statusMap[normalized] ?? (normalized.toUpperCase() as OrderStatus)
}

function computeReadiness(items: OrderItem[]) {
  const totalRequested = items.reduce((acc, item) => acc + (item.qtyRequested ?? 0), 0)
  const totalReserved = items.reduce((acc, item) => acc + (item.qtyReservedFromStock ?? 0), 0)
  if (totalReserved <= 0) return 'NOT_READY'
  if (totalReserved >= totalRequested) return 'READY_FULL'
  return 'READY_PARTIAL'
}

type OrderRow = {
  order_id: number
  order_number: string | null
  status: string | null
  total: string | number | null
  created_at: Date | string
  due_date: Date | string | null
  trashed_at: Date | string | null
  client_id: number | null
  client_name: string | null
  created_by: string | null
  picker_id: string | null
  volume_count: number | null
  label_print_count: number | null
  item_id: number | null
  material_id: number | null
  quantity: string | number | null
  unit_price: string | number | null
  material_name: string | null
  material_unit: string | null
  color: string | null
  shortage_action: string | null
  qty_reserved_from_stock: string | number | null
  qty_to_produce: string | number | null
  qty_separated: string | number | null
  separated_weight: string | number | null
  item_condition: string | null
  condition_template_name: string | null
}

const orderQuery = `SELECT
  o.id AS order_id,
  o.order_number,
  o.status,
  o.total,
  o.created_at,
  o.due_date,
  o.trashed_at,
  o.client_id,
  o.client_name,
  o.created_by,
  o.picker_id,
  o.volume_count,
  o.label_print_count,
  oi.id AS item_id,
  oi.material_id,
  oi.quantity,
  oi.conditions,
  oi.unit_price,
  oi.color,
  oi.shortage_action,
  oi.qty_reserved_from_stock,
  oi.qty_to_produce,
  oi.qty_separated,
  oi.separated_weight,
  oi.item_condition,
  oi.condition_template_name,
  m.name AS material_name,
  m.unit AS material_unit
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN materials m ON m.id = oi.material_id`

function buildOrdersFromRows(rows: OrderRow[]): Order[] {
  const map = new Map<number, Order>()
  const dayCounters = new Map<string, number>()

  for (const row of rows) {
    const oid = Number(row.order_id)
    let orderNumberStored: string | null = null
    if (row.order_number) orderNumberStored = String(row.order_number)

    if (!map.has(oid)) {
      const created = row.created_at ? new Date(row.created_at) : new Date()
      const day = created.toISOString().slice(0, 10)
      const dayKey = day.replace(/-/g, '')
      if (orderNumberStored && /^\d{8}\d+$/.test(orderNumberStored)) {
        const storedDay = orderNumberStored.slice(0, 8)
        const storedSeq = Number(orderNumberStored.slice(8)) || 0
        const prevStored = dayCounters.get(storedDay) ?? 0
        if (storedSeq > prevStored) dayCounters.set(storedDay, storedSeq)
      }
      const prev = dayCounters.get(dayKey) ?? 0
      const seq = prev + 1
      dayCounters.set(dayKey, seq)
      const orderNumber = orderNumberStored ?? `${dayKey}${String(seq).padStart(2, '0')}`
      const normalizedStatus = normalizeStatus(row.status)

      map.set(oid, {
        id: `O-${oid}`,
        orderNumber,
        clientId: row.client_id ? `C-${row.client_id}` : '',
        clientName: row.client_name ?? '',
        status: normalizedStatus,
        readiness: 'NOT_READY',
        orderDate: created.toISOString(),
        dueDate: row.due_date ? new Date(row.due_date).toISOString() : created.toISOString(),
        createdBy: row.created_by ?? '',
        pickerId: row.picker_id ?? undefined,
        volumeCount: Number(row.volume_count ?? 1),
        items: [],
        auditTrail: [],
        labelPrintCount: Number(row.label_print_count ?? 0),
        total: Number(row.total ?? 0),
        trashedAt: row.trashed_at ? (row.trashed_at instanceof Date ? row.trashed_at.toISOString() : String(row.trashed_at)) : null,
      })
    }

    if (row.item_id) {
      const order = map.get(oid)!
      const qtyRequested = Number(row.quantity ?? 0)
      const qtyReservedFromStock = Math.max(0, Number(row.qty_reserved_from_stock ?? 0))
      const qtyToProduce = Math.max(0, Number(row.qty_to_produce ?? 0))
      order.items.push({
        id: `itm-${row.item_id}`,
        materialId: row.material_id ? `M-${row.material_id}` : `M-${row.item_id}`,
        materialName: row.material_name || '',
        uom: row.material_unit || 'EA',
        color: row.color ?? '',
        shortageAction: (String(row.shortage_action ?? 'PRODUCE').toUpperCase() === 'BUY' ? 'BUY' : 'PRODUCE'),
        qtyRequested,
        qtyReservedFromStock,
        qtyToProduce,
        qtySeparated: Number(row.qty_separated ?? 0),
        separatedWeight: row.separated_weight ? Number(row.separated_weight) : undefined,
        itemCondition: row.item_condition ?? undefined,
        conditionTemplateName: row.condition_template_name ?? undefined,
        conditions: Array.isArray((row as any).conditions) ? (row as any).conditions : ((row as any).conditions ? JSON.parse(String((row as any).conditions)) : []),
      })
    }
  }

  const orders = Array.from(map.values())
  orders.forEach((order) => {
    order.volumeCount = Math.max(1, order.items.length)
    order.readiness = computeReadiness(order.items)
  })

  return orders
}

async function runOrderQuery(queryText: string, params?: unknown[]): Promise<Order[]> {
  const totalStart = process.hrtime.bigint()
  const res = await query<OrderRow>(queryText, params)
  const queryMs = res.queryTimeMs

  const serializationStart = process.hrtime.bigint()
  const orders = buildOrdersFromRows(res.rows)
  const serializationMs = Number(process.hrtime.bigint() - serializationStart) / 1_000_000
  const totalMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000

  logRepoPerf('orders:list', {
    queryMs,
    serializationMs,
    totalMs,
    rows: orders.length,
  })

  return orders
}

export async function listOrders(): Promise<Order[]> {
  return runOrderQuery(`${orderQuery} ORDER BY o.created_at ASC`)
}

export async function listTrashedOrders(): Promise<Order[]> {
  return runOrderQuery(`${orderQuery} WHERE o.trashed_at IS NOT NULL ORDER BY o.created_at DESC`)
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const numericId = Number(String(orderId).replace(/^O-/, ''))
  if (Number.isNaN(numericId)) return null
  const rows = await runOrderQuery(`${orderQuery} WHERE o.id = $1`, [numericId])
  return rows[0] ?? null
}
