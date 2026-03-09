import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { isUnauthorizedError, requireAuth } from '@/lib/auth'
import { invalidateDashboardCache, refreshDashboardSnapshot, revalidateDashboardTag } from '@/lib/repository/dashboard'
import { logActivity } from '@/lib/log-activity'
import { publishRealtimeEvent } from '@/lib/pubsub'

type ApiOrder = {
  id: string
  orderNumber: string
  clientId: string
  clientName: string
  status: 'RASCUNHO' | 'ABERTO' | 'EM_PICKING' | 'FINALIZADO' | 'SAIDA_CONCLUIDA' | 'CANCELADO'
  readiness: 'NOT_READY' | 'READY_PARTIAL' | 'READY_FULL'
  orderDate: string
  dueDate: string
  createdBy: string
  pickerId?: string
  volumeCount: number
  items: Array<{
    id: string
    materialId: string
    materialName: string
    uom: string
    color: string
    description?: string
    shortageAction?: 'PRODUCE' | 'BUY'
    qtyRequested: number
    qtyReservedFromStock: number
    qtyToProduce: number
    qtySeparated: number
    separatedWeight?: number
    itemCondition?: string
    conditionTemplateName?: string
    conditions: unknown[]
  }>
  auditTrail: unknown[]
  labelPrintCount: number
  total: number
  trashedAt: string | null
  hasPendingProduction?: boolean
  isMrp?: boolean
}

type OrderRow = {
  order_id: number
  order_number: string | null
  status: string | null
  total: string | number | null
  created_at: Date | string | null
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
  conditions: any | null
  item_description: string | null
  has_pending_production?: boolean | null
  order_source: string | null
}

const statusMap: Record<string, ApiOrder['status']> = {
  draft: 'RASCUNHO',
  rascunho: 'RASCUNHO',
  aberto: 'ABERTO',
  'em_picking': 'EM_PICKING',
  'em picking': 'EM_PICKING',
  'em-picking': 'EM_PICKING',
  'saída finalizada': 'SAIDA_CONCLUIDA',
  'saida_concluida': 'SAIDA_CONCLUIDA',
  'saida-concluida': 'SAIDA_CONCLUIDA',
  finalizado: 'FINALIZADO',
  cancelado: 'CANCELADO',
}

function normalizeStatus(status?: string | null): ApiOrder['status'] {
  if (!status) return 'ABERTO'
  const normalized = String(status).trim().toLowerCase()
  return statusMap[normalized] ?? (normalized.toUpperCase() as ApiOrder['status'])
}

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo'
const brazilDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: BRAZIL_TIME_ZONE })

function formatBrazilianDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return brazilDateFormatter.format(date)
}

function getBrazilianDayKey(iso: string) {
  return formatBrazilianDate(iso).replace(/-/g, '')
}

function computeReadiness(items: ApiOrder['items']) {
  const totalRequested = items.reduce((acc, item) => acc + item.qtyRequested, 0)
  const totalReserved = items.reduce((acc, item) => acc + item.qtyReservedFromStock, 0)
  if (totalReserved <= 0) return 'NOT_READY'
  if (totalReserved >= totalRequested) return 'READY_FULL'
  return 'READY_PARTIAL'
}

async function generateManualOrderNumber(createdIso: string) {
  const dateStr = formatBrazilianDate(createdIso)
  const dayKey = dateStr.replace(/-/g, '')
  const counter = await query<{ last_seq: number }>(
    `INSERT INTO order_number_counters (day, last_seq)
     VALUES ($1::date, 1)
     ON CONFLICT (day) DO UPDATE
       SET last_seq = order_number_counters.last_seq + 1
     RETURNING last_seq`,
    [dateStr]
  )
  const seq = Number(counter.rows[0]?.last_seq ?? 0)
  return `${dayKey}${String(seq).padStart(2, '0')}`
}

const perfEnabled = process.env.NODE_ENV !== 'production' || process.env.DEBUG_PERF === 'true'

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const totalStart = process.hrtime.bigint()
    const res = await query<OrderRow>(
      `SELECT
         o.id as order_id,
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
         oi.id as item_id,
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
         oi.item_description,
        m.name as material_name,
        m.unit as material_unit,
        o.source AS order_source,
        pp.has_pending_production AS has_pending_production
      FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN materials m ON m.id = oi.material_id
       LEFT JOIN LATERAL (
         SELECT EXISTS(SELECT 1 FROM production_tasks pt WHERE pt.order_id = o.id AND pt.status <> 'DONE') AS has_pending_production
       ) pp ON true
       ORDER BY o.created_at ASC`
    )
    const rows = res.rows || []
    const queryMs = res.queryTimeMs

    const map = new Map<number, ApiOrder>()
    const dayCounters = new Map<string, number>()
    for (const r of rows) {
      const oid = Number(r.order_id)
      let orderNumberStored: string | null = null
      if (r.order_number) orderNumberStored = String(r.order_number)
      if (!map.has(oid)) {
        const created = r.created_at ? new Date(r.created_at) : new Date()
        const createdIso = created.toISOString()
        const dayKey = getBrazilianDayKey(createdIso)
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
        const normalizedStatus = normalizeStatus(r.status)

        map.set(oid, {
          id: `O-${oid}`,
          orderNumber,
          clientId: r.client_id ? `C-${r.client_id}` : '',
          clientName: r.client_name ?? '',
          status: normalizedStatus,
          readiness: 'NOT_READY',
          orderDate: created.toISOString(),
          dueDate: r.due_date ? new Date(r.due_date).toISOString() : created.toISOString(),
          createdBy: r.created_by ?? '',
          pickerId: r.picker_id ?? undefined,
          volumeCount: Number(r.volume_count ?? 1),
          items: [],
          auditTrail: [],
          labelPrintCount: Number(r.label_print_count ?? 0),
          total: Number(r.total ?? 0),
          trashedAt: r.trashed_at ? (r.trashed_at instanceof Date ? r.trashed_at.toISOString() : String(r.trashed_at)) : null,
          hasPendingProduction: Boolean(r.has_pending_production ?? false),
          isMrp: String(r.order_source ?? '').toLowerCase() === 'mrp',
        })
      }
      if (r.item_id) {
        const order = map.get(oid)!
        const qtyRequested = Number(r.quantity ?? 0)
        const qtyReservedFromStock = Math.max(0, Number(r.qty_reserved_from_stock ?? 0))
        const qtyToProduce = Math.max(0, Number(r.qty_to_produce ?? 0))
        order.items.push({
          id: `itm-${r.item_id}`,
          materialId: `M-${r.material_id}`,
          materialName: r.material_name || `M-${r.material_id}`,
          uom: r.material_unit || 'EA',
          color: r.color ?? '',
          description: r.item_description ?? undefined,
          shortageAction: (String(r.shortage_action ?? 'PRODUCE').toUpperCase() === 'BUY' ? 'BUY' : 'PRODUCE'),
          qtyRequested,
          qtyReservedFromStock,
          qtyToProduce,
          qtySeparated: Number(r.qty_separated ?? 0),
          separatedWeight: r.separated_weight ? Number(r.separated_weight) : undefined,
          itemCondition: r.item_condition ?? undefined,
          conditionTemplateName: r.condition_template_name ?? undefined,
          conditions: Array.isArray(r.conditions) ? r.conditions : (r.conditions ? JSON.parse(String(r.conditions)) : []),
        })
      }
    }

    const serializationStart = process.hrtime.bigint()
    const orders = Array.from(map.values())
    if (orders.length > 0) {
      const ids = orders.map((o) => Number(String(o.id).replace(/^O-/, ''))).filter((n) => !Number.isNaN(n))
      const auditRes = await query(
        `SELECT id, order_id, action, actor, timestamp, details
         FROM audit_events
         WHERE order_id = ANY($1::int[])
         ORDER BY timestamp DESC`,
        [ids]
      )
      const auditMap = new Map<number, any[]>()
      for (const row of auditRes.rows as any[]) {
        const list = auditMap.get(row.order_id) ?? []
        list.push({
          id: `AUD-${row.id}`,
          action: row.action,
          actor: row.actor,
          timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
          details: row.details ?? undefined,
        })
        auditMap.set(row.order_id, list)
      }
      for (const order of orders) {
        const oid = Number(String(order.id).replace(/^O-/, ''))
        order.auditTrail = auditMap.get(oid) ?? []
      }
    }
    for (const order of orders) {
      order.volumeCount = Math.max(1, order.items.length)
      order.readiness = computeReadiness(order.items)
    }
    const serializationMs = Number(process.hrtime.bigint() - serializationStart) / 1_000_000
    const totalMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000
    if (perfEnabled) {
      console.debug(
        `[perf][api/orders] query=${queryMs.toFixed(2)}ms serialization=${serializationMs.toFixed(2)}ms total=${totalMs.toFixed(2)}ms rows=${orders.length}`
      )
    }
    return NextResponse.json(orders)
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('orders GET error', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const payload = await request.json().catch(() => ({}))
    const statusRaw = String(payload.status ?? 'draft').toLowerCase()
    const status = ['rascunho', 'draft'].includes(statusRaw) ? 'draft' : statusRaw
    const clientName = typeof payload.clientName === 'string' ? payload.clientName.trim() : ''
    const dueDate = payload.dueDate ? new Date(payload.dueDate) : null
    const sourceRaw = String(payload.source ?? '').trim().toLowerCase()
    const source = sourceRaw === 'mrp' ? 'mrp' : 'manual'

    const client = await query(
      'INSERT INTO orders (status, total, created_by, client_name, due_date, source) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at',
      [status, 0, auth.userId, clientName || null, dueDate, source]
    )
    const orderId = Number(client.rows[0].id)
    const createdAt = client.rows[0].created_at ?? new Date().toISOString()
    const createdIso = new Date(createdAt).toISOString()

    let orderNumber: string
    if (source === 'mrp') {
      orderNumber = `MRP-${orderId}`
    } else {
      orderNumber = await generateManualOrderNumber(createdIso)
    }
    await query('UPDATE orders SET order_number = $1 WHERE id = $2', [orderNumber, orderId])

    const response = NextResponse.json({
      id: `O-${orderId}`,
      orderNumber,
      status: normalizeStatus(status),
      clientId: '',
      clientName,
      orderDate: createdIso,
      dueDate: dueDate ? dueDate.toISOString() : new Date(createdAt).toISOString(),
      createdBy: auth.userId,
      volumeCount: 1,
      items: [],
      auditTrail: [],
      labelPrintCount: 0,
      readiness: 'NOT_READY',
      total: 0,
      trashedAt: null,
    })

    // Background refresh
    await invalidateDashboardCache()
    await refreshDashboardSnapshot()
    revalidateDashboardTag()

    await publishRealtimeEvent('ORDER_CREATED', { orderId })

    // Log activity
    logActivity(auth.userId, 'ORDER_CREATED', 'order', orderId).catch(console.error)

    return response
  } catch (err: unknown) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    console.error('orders POST error', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
