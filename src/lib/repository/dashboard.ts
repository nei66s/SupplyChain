import { revalidateTag, unstable_cache } from 'next/cache'
import { query } from '../db'
import { getJsonCache, invalidateCache, setJsonCache } from '../cache'
import { logRepoPerf, perfEnabled } from './perf'
import {
  InventoryReceipt,
  Material,
  Notification,
  Order,
  OrderItem,
  OrderStatus,
  ProductionTask,
  ProductionTaskStatus,
  StockBalance,
  StockReservation,
  User,
} from '../domain/types'

const statusMap: Record<string, OrderStatus> = {
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
  conditions?: any | null
}

type ProductionTaskRow = {
  id: number
  order_id: number
  material_id: number
  qty_to_produce: string | number
  status: ProductionTaskStatus
  created_at: string
  updated_at: string
  order_number: string | null
  material_name: string | null
}

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

type UserRow = {
  id: string
  name: string
  email: string
  role: User['role']
  avatar_url: string | null
}

type StockReservationRow = {
  id: number
  material_id: number
  order_id: number
  user_id: string | null
  user_name: string | null
  qty: string | number
  expires_at: string
  updated_at: string
  created_at: string
}

type InventoryReceiptItemSnapshot = {
  material_id: number | null
  material_name: string | null
  qty: string | number | null
  uom: string | null
}

type InventoryReceiptSnapshotRow = {
  id: number
  type: InventoryReceipt['type']
  status: InventoryReceipt['status']
  source_ref: string | null
  created_at: string
  posted_at: string | null
  posted_by: string | null
  auto_allocated: boolean | null
  items: InventoryReceiptItemSnapshot[] | null
  item_count: number
  total_qty: string | number | null
}

type NotificationRow = {
  id: number
  type: Notification['type']
  title: string
  message: string | null
  created_at: string
  read_at: string | null
  role_target: Notification['roleTarget'] | null
  order_id: number | null
  material_id: number | null
  dedupe_key: string | null
}

export type DashboardData = {
  orders: Order[]
  productionTasks: ProductionTask[]
  materials: Material[]
  stockBalances: StockBalance[]
  stockReservations: StockReservation[]
  users: User[]
  inventoryReceipts: InventoryReceipt[]
  notifications: Notification[]
}

type QueryProfileEntry = {
  label: string
  queryMs: number
  rows: number
}

type LoadResult<T> = T & {
  queryMs: number
  queryProfile: QueryProfileEntry[]
}

const DASHBOARD_CACHE_KEY = 'dashboard:snapshot'
const MATERIALIZED_VIEW_REFRESH_INTERVAL_MS = 15_000
const MATERIALIZED_VIEWS = [
  'dashboard_orders_view',
  'dashboard_production_tasks_view',
  'dashboard_materials_stock_view',
  'mv_inventory_receipts_snapshot',
]
let bypassRedisCache = false

async function loadOrders(): Promise<LoadResult<{ items: Order[] }>> {
  const res = await query<OrderRow>(`
    SELECT *
    FROM dashboard_orders_view
    ORDER BY created_at ASC
  `)

  const map = new Map<number, Order>()
  const dayCounters = new Map<string, number>()
  for (const row of res.rows) {
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
        conditions: parseJson(row.conditions, []),
      })
    }
  }

  const orders = Array.from(map.values())
  orders.forEach((order) => {
    order.volumeCount = Math.max(1, order.items.length)
    order.readiness = computeReadiness(order.items)
  })

  const queryProfile: QueryProfileEntry[] = [
    { label: 'dashboard_orders_view', queryMs: res.queryTimeMs, rows: res.rowCount ?? 0 },
  ]

  return { items: orders, queryMs: res.queryTimeMs, queryProfile }
}

async function loadProductionTasks(): Promise<LoadResult<{ items: ProductionTask[] }>> {
  const res = await query<ProductionTaskRow>(
    `SELECT *
     FROM dashboard_production_tasks_view
     ORDER BY created_at ASC, id ASC`
  )

  const items = res.rows.map((row) => ({
    id: `PT-${row.id}`,
    orderId: `O-${row.order_id}`,
    materialId: `M-${row.material_id}`,
    orderNumber: row.order_number || `O-${row.order_id}`,
    materialName: row.material_name || `M-${row.material_id}`,
    qtyToProduce: Number(row.qty_to_produce ?? 0),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  const queryProfile: QueryProfileEntry[] = [
    { label: 'dashboard_production_tasks_view', queryMs: res.queryTimeMs, rows: res.rowCount ?? 0 },
  ]

  return { items, queryMs: res.queryTimeMs, queryProfile }
}

async function loadMaterialsWithStock(): Promise<
  LoadResult<{ materials: Material[]; stockBalances: StockBalance[] }>
> {
  const res = await query<MaterialStockRow>(`
    SELECT *
    FROM dashboard_materials_stock_view
  `)

  const materials = res.rows.map((row) => {
    const colorOptionsRaw = parseJson<unknown>(row.color_options, [])
    const metadataRaw = parseJson<Record<string, unknown>>(row.metadata, {})
    const metadata = Object.fromEntries(
      Object.entries(metadataRaw).map(([key, value]) => [key, String(value ?? '')])
    ) as Record<string, string>

    return {
      id: `M-${row.id}`,
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

  const stockBalances = res.rows.map((row) => ({
    materialId: `M-${row.id}`,
    onHand: Number(row.on_hand ?? 0),
    reservedTotal: Number(row.reserved_total ?? 0),
    productionReserved: Number((row as any).production_reserved ?? 0),
  }))

  const queryProfile: QueryProfileEntry[] = [
    { label: 'dashboard_materials_stock_view', queryMs: res.queryTimeMs, rows: res.rowCount ?? 0 },
  ]

  return { materials, stockBalances, queryMs: res.queryTimeMs, queryProfile }
}

async function loadUsers(): Promise<LoadResult<{ items: User[] }>> {
  const res = await query<UserRow>(`
    SELECT id, name, email, role, avatar_url
    FROM users
    ORDER BY name ASC
  `)

  const users = res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url ?? undefined,
  }))

  const queryProfile: QueryProfileEntry[] = [
    { label: 'users', queryMs: res.queryTimeMs, rows: res.rowCount ?? 0 },
  ]

  return { items: users, queryMs: res.queryTimeMs, queryProfile }
}

async function loadStockReservations(): Promise<LoadResult<{ items: StockReservation[] }>> {
  const res = await query<StockReservationRow>(`
    SELECT
      sr.id,
      sr.material_id,
      sr.order_id,
      sr.user_id,
      u.name AS user_name,
      sr.qty,
      sr.expires_at,
      sr.updated_at,
      sr.created_at
    FROM stock_reservations sr
    LEFT JOIN users u ON u.id = sr.user_id
    WHERE sr.expires_at > now()
    ORDER BY sr.expires_at ASC
  `)

  const items = res.rows.map((row) => ({
    id: `SR-${row.id}`,
    materialId: `M-${row.material_id}`,
    orderId: `O-${row.order_id}`,
    userId: row.user_id ?? '',
    userName: row.user_name ?? 'Usuario',
    qty: Number(row.qty ?? 0),
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }))

  const queryProfile: QueryProfileEntry[] = [
    { label: 'stock_reservations_active', queryMs: res.queryTimeMs, rows: res.rowCount ?? 0 },
  ]

  return { items, queryMs: res.queryTimeMs, queryProfile }
}

async function loadInventoryReceipts(): Promise<LoadResult<{ items: InventoryReceipt[] }>> {
  const res = await query<InventoryReceiptSnapshotRow>(`
    SELECT *
    FROM mv_inventory_receipts_snapshot
    ORDER BY created_at DESC
  `)

  const receipts = res.rows.map((row) => {
    const parsedItems = parseJson<InventoryReceiptItemSnapshot[]>(row.items, [])
    const items: InventoryReceipt['items'] = parsedItems.map((item) => ({
      materialId: item.material_id ? `M-${item.material_id}` : '',
      materialName: item.material_name ?? '',
      qty: Number(item.qty ?? 0),
      uom: item.uom ?? 'EA',
    }))

    return {
      id: `IR-${row.id}`,
      type: row.type,
      status: row.status,
      items,
      sourceRef: row.source_ref ?? '',
      createdAt: row.created_at,
      postedAt: row.posted_at ?? undefined,
      postedBy: row.posted_by ?? undefined,
      autoAllocated: Boolean(row.auto_allocated),
    }
  })

  const queryProfile: QueryProfileEntry[] = [
    { label: 'mv_inventory_receipts_snapshot', queryMs: res.queryTimeMs, rows: res.rowCount ?? 0 },
  ]

  return { items: receipts, queryMs: res.queryTimeMs, queryProfile }
}

async function loadNotifications(): Promise<LoadResult<{ items: Notification[] }>> {
  const res = await query<NotificationRow>(`
    SELECT id, type, title, message, created_at, read_at, role_target, order_id, material_id, dedupe_key
    FROM notifications
    ORDER BY created_at DESC
  `)
  const items = res.rows.map((row) => ({
    id: `N-${row.id}`,
    type: row.type,
    title: row.title,
    message: row.message ?? '',
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
    roleTarget: row.role_target ?? undefined,
    orderId: row.order_id ? `O-${row.order_id}` : undefined,
    materialId: row.material_id ? `M-${row.material_id}` : undefined,
    dedupeKey: row.dedupe_key ?? undefined,
  }))
  const queryProfile: QueryProfileEntry[] = [
    { label: 'notifications_recent', queryMs: res.queryTimeMs, rows: res.rowCount ?? 0 },
  ]

  return { items, queryMs: res.queryTimeMs, queryProfile }
}

async function createDashboardSnapshotInternal(): Promise<DashboardData> {
  const totalStart = process.hrtime.bigint()
  const [ordersResult, tasksResult, materialsResult, usersResult, reservationsResult, receiptsResult, notificationsResult] = await Promise.all([
    loadOrders(),
    loadProductionTasks(),
    loadMaterialsWithStock(),
    loadUsers(),
    loadStockReservations(),
    loadInventoryReceipts(),
    loadNotifications(),
  ])

  const segmentResults = [
    ordersResult,
    tasksResult,
    materialsResult,
    usersResult,
    reservationsResult,
    receiptsResult,
    notificationsResult,
  ]
  const combinedQueryProfiles = segmentResults.flatMap((result) => result.queryProfile)

  const serializationStart = process.hrtime.bigint()
  const dashboardData: DashboardData = {
    orders: ordersResult.items,
    productionTasks: tasksResult.items,
    materials: materialsResult.materials,
    stockBalances: materialsResult.stockBalances,
    stockReservations: reservationsResult.items,
    users: usersResult.items,
    inventoryReceipts: receiptsResult.items,
    notifications: notificationsResult.items,
  }
  const serializationMs = Number(process.hrtime.bigint() - serializationStart) / 1_000_000

  const totalMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000
  logDashboardSnapshotQueryProfile(combinedQueryProfiles, totalMs)
  logRepoPerf('repo:dashboardSnapshot', {
    queryMs: segmentResults.reduce((sum, result) => sum + result.queryMs, 0),
    serializationMs,
    totalMs,
    rows: dashboardData.orders.length + dashboardData.productionTasks.length,
  })

  return dashboardData
}

function logDashboardSnapshotQueryProfile(queryProfiles: QueryProfileEntry[], totalMs: number) {
  if (!perfEnabled || queryProfiles.length === 0) {
    return
  }

  const detail = queryProfiles
    .map((profile) => `${profile.label}=${profile.queryMs.toFixed(2)}ms rows=${profile.rows}`)
    .join(' | ')
  const slowest = queryProfiles.reduce((prev, current) => (current.queryMs > prev.queryMs ? current : prev), queryProfiles[0])

  console.debug(`[perf][repo:dashboardSnapshot:queries] totalMs=${totalMs.toFixed(2)}ms ${detail}`)
  console.debug(
    `[perf][repo:dashboardSnapshot:slowest] ${slowest.label}=${slowest.queryMs.toFixed(2)}ms rows=${slowest.rows}`
  )
}

// Keep dashboard data fresh-ish (~15s) while reusing the cached snapshot and Redis fallback.
async function loadDashboardSnapshot(): Promise<DashboardData> {
  const skipCache = bypassRedisCache
  bypassRedisCache = false
  if (!skipCache) {
    const cached = await getJsonCache<DashboardData>(DASHBOARD_CACHE_KEY)
    if (cached) return cached
  }
  const snapshot = await createDashboardSnapshotInternal()
  await setJsonCache(DASHBOARD_CACHE_KEY, snapshot)
  return snapshot
}

export const getDashboardSnapshot = unstable_cache(
  async () => loadDashboardSnapshot(),
  ['dashboard'],
  { tags: ['dashboard'] }
)

export function revalidateDashboardTag() {
  try {
    revalidateTag('dashboard')
  } catch (e) {
    console.error('[dashboard] revalidateTag failed', e)
  }
}

export async function invalidateDashboardCache() {
  await invalidateCache(DASHBOARD_CACHE_KEY)
}

let pendingMaterializedRefresh: Promise<void> | null = null
let lastMaterializedRefreshAt = 0

type RevalidableDashboardSnapshot = typeof getDashboardSnapshot & {
  revalidate?: () => Promise<void>
}

async function refreshMaterializedViews(): Promise<void> {
  await Promise.all(
    MATERIALIZED_VIEWS.map((view) => {
      const refreshSql =
        view === 'mv_inventory_receipts_snapshot'
          ? `REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`
          : `REFRESH MATERIALIZED VIEW ${view}`
      return query(refreshSql)
    })
  )
}

function scheduleDashboardRefresh(force = false): Promise<void> | null {
  const now = Date.now()
  if (!force && now - lastMaterializedRefreshAt < MATERIALIZED_VIEW_REFRESH_INTERVAL_MS) {
    return null
  }
  if (pendingMaterializedRefresh) return pendingMaterializedRefresh

  pendingMaterializedRefresh = (async () => {
    try {
      await refreshMaterializedViews()
      lastMaterializedRefreshAt = Date.now()
      bypassRedisCache = true
      const snapshotCache = getDashboardSnapshot as RevalidableDashboardSnapshot
      if (typeof snapshotCache.revalidate === 'function') {
        await snapshotCache.revalidate()
      } else {
        revalidateDashboardTag()
      }
    } catch (error) {
      console.error('[dashboard] refresh failed; continuing without blocking request', error)
    } finally {
      pendingMaterializedRefresh = null
    }
  })()

  return pendingMaterializedRefresh
}

export async function refreshDashboardSnapshot(waitForRefresh = true) {
  const refreshPromise = scheduleDashboardRefresh(waitForRefresh)
  if (waitForRefresh && refreshPromise) {
    await refreshPromise
  }
}
