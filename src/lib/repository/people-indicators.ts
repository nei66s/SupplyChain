import { query } from '../db'

export type PersonRanking = {
  userId: string
  userName: string
  count: number
  totalQty: number
}

export type PersonSla = {
  userId: string
  userName: string
  avgDurationSeconds: number
  tasksCompleted: number
}

export type DailyTrend = {
  date: string
  totalQty: number
  tasksCompleted: number
}

export type PersonWeight = {
  userId: string
  userName: string
  totalWeight: number
  count: number
}

export type PersonVolume = {
  userId: string
  userName: string
  totalQtySeparated: number
  ordersCount: number
}

export type OrderCompletionRate = {
  userId: string
  userName: string
  totalCreated: number
  totalFinalized: number
  rate: number
}

export type HourProductivity = {
  hour: number
  tasksCompleted: number
}

export type PersonPendingTasks = {
  userId: string
  userName: string
  pendingCount: number
  inProgressCount: number
}

export type PeopleIndicatorsData = {
  topProducers: PersonRanking[]
  topOrderCreators: PersonRanking[]
  topPickers: PersonRanking[]
  slaByPerson: PersonSla[]
  dailyProductionTrend: DailyTrend[]
  weightByPerson: PersonWeight[]
  volumeSeparatedByPerson: PersonVolume[]
  orderCompletionRate: OrderCompletionRate[]
  peakHours: HourProductivity[]
  pendingTasksByPerson: PersonPendingTasks[]
  summary: {
    tasksCompletedToday: number
    ordersCreatedToday: number
    avgResponseSeconds: number | null
  }
}

function periodFilter(period: string): { clause: string; params: unknown[] } {
  if (period === '7d') {
    return { clause: `AND pal.created_at >= now() - interval '7 days'`, params: [] }
  }
  if (period === '30d') {
    return { clause: `AND pal.created_at >= now() - interval '30 days'`, params: [] }
  }
  return { clause: '', params: [] }
}

export async function getPeopleIndicators(period = '30d'): Promise<PeopleIndicatorsData> {
  const pf = periodFilter(period)

  // Top Producers — from activity log + fallback from production_tasks
  const topProducersRes = await query<{
    user_id: string
    user_name: string
    count: string
    total_qty: string
  }>(`
    SELECT
      pal.user_id,
      COALESCE(u.name, pal.user_id) AS user_name,
      COUNT(*)::TEXT AS count,
      COALESCE(SUM(pal.qty), 0)::TEXT AS total_qty
    FROM people_activity_log pal
    LEFT JOIN users u ON u.id = pal.user_id
    WHERE pal.action_type = 'PRODUCTION_COMPLETED'
    ${pf.clause}
    GROUP BY pal.user_id, u.name
    ORDER BY COALESCE(SUM(pal.qty), 0) DESC
    LIMIT 15
  `)

  // Top Order Creators
  const topOrderCreatorsRes = await query<{
    user_id: string
    user_name: string
    count: string
    total_qty: string
  }>(`
    SELECT
      pal.user_id,
      COALESCE(u.name, pal.user_id) AS user_name,
      COUNT(*)::TEXT AS count,
      COALESCE(SUM(pal.qty), 0)::TEXT AS total_qty
    FROM people_activity_log pal
    LEFT JOIN users u ON u.id = pal.user_id
    WHERE pal.action_type = 'ORDER_CREATED'
    ${pf.clause}
    GROUP BY pal.user_id, u.name
    ORDER BY COUNT(*) DESC
    LIMIT 15
  `)

  // Top Pickers (separation completed)
  const topPickersRes = await query<{
    user_id: string
    user_name: string
    count: string
    total_qty: string
  }>(`
    SELECT
      pal.user_id,
      COALESCE(u.name, pal.user_id) AS user_name,
      COUNT(*)::TEXT AS count,
      COALESCE(SUM(pal.qty), 0)::TEXT AS total_qty
    FROM people_activity_log pal
    LEFT JOIN users u ON u.id = pal.user_id
    WHERE pal.action_type IN ('PICK_COMPLETED', 'SEPARATION_DONE')
    ${pf.clause}
    GROUP BY pal.user_id, u.name
    ORDER BY COUNT(*) DESC
    LIMIT 15
  `)

  // SLA by person — average task completion duration
  const slaRes = await query<{
    user_id: string
    user_name: string
    avg_duration: string
    tasks_completed: string
  }>(`
    SELECT
      pal.user_id,
      COALESCE(u.name, pal.user_id) AS user_name,
      COALESCE(AVG(pal.duration_seconds), 0)::TEXT AS avg_duration,
      COUNT(*)::TEXT AS tasks_completed
    FROM people_activity_log pal
    LEFT JOIN users u ON u.id = pal.user_id
    WHERE pal.action_type IN ('PRODUCTION_COMPLETED', 'PICK_COMPLETED', 'SEPARATION_DONE')
      AND pal.duration_seconds IS NOT NULL
    ${pf.clause}
    GROUP BY pal.user_id, u.name
    ORDER BY AVG(pal.duration_seconds) ASC
    LIMIT 15
  `)

  // Daily production trend (last 14 days)
  const trendRes = await query<{
    date: string
    total_qty: string
    tasks_completed: string
  }>(`
    SELECT
      DATE(pal.created_at) AS date,
      COALESCE(SUM(pal.qty), 0)::TEXT AS total_qty,
      COUNT(*)::TEXT AS tasks_completed
    FROM people_activity_log pal
    WHERE pal.action_type = 'PRODUCTION_COMPLETED'
      AND pal.created_at >= now() - interval '14 days'
    GROUP BY DATE(pal.created_at)
    ORDER BY DATE(pal.created_at) ASC
  `)

  // Summary — today's numbers
  const summaryRes = await query<{
    tasks_completed_today: string
    orders_created_today: string
    avg_response: string | null
  }>(`
    SELECT
      COALESCE(SUM(CASE WHEN action_type = 'PRODUCTION_COMPLETED' AND DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END), 0)::TEXT AS tasks_completed_today,
      COALESCE(SUM(CASE WHEN action_type = 'ORDER_CREATED' AND DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END), 0)::TEXT AS orders_created_today,
      (CASE WHEN COUNT(CASE WHEN duration_seconds IS NOT NULL AND DATE(created_at) = CURRENT_DATE THEN 1 END) > 0
        THEN AVG(CASE WHEN duration_seconds IS NOT NULL AND DATE(created_at) = CURRENT_DATE THEN duration_seconds END)::TEXT
        ELSE NULL END) AS avg_response
    FROM people_activity_log
  `)

  const summary = summaryRes.rows[0]

  // Also try to enrich from existing data if activity log is empty
  // Fallback: use orders.created_by and production_tasks for historical data
  let topProducersFallback: PersonRanking[] = []
  let topOrderCreatorsFallback: PersonRanking[] = []
  let topPickersFallback: PersonRanking[] = []

  if (topProducersRes.rows.length === 0) {
    const fallback = await query<{
      user_id: string
      user_name: string
      count: string
      total_qty: string
    }>(`
      SELECT
        COALESCE(o.created_by, 'unknown') AS user_id,
        COALESCE(u.name, o.created_by, 'Desconhecido') AS user_name,
        COUNT(DISTINCT pt.id)::TEXT AS count,
        COALESCE(SUM(pt.qty_to_produce), 0)::TEXT AS total_qty
      FROM production_tasks pt
      JOIN orders o ON o.id = pt.order_id
      LEFT JOIN users u ON u.id = o.created_by
      WHERE pt.status = 'DONE'
        AND o.trashed_at IS NULL
      GROUP BY o.created_by, u.name
      ORDER BY COALESCE(SUM(pt.qty_to_produce), 0) DESC
      LIMIT 15
    `)
    topProducersFallback = fallback.rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      count: Number(r.count),
      totalQty: Number(r.total_qty),
    }))
  }

  if (topOrderCreatorsRes.rows.length === 0) {
    const fallback = await query<{
      user_id: string
      user_name: string
      count: string
    }>(`
      SELECT
        COALESCE(o.created_by, 'unknown') AS user_id,
        COALESCE(u.name, o.created_by, 'Desconhecido') AS user_name,
        COUNT(*)::TEXT AS count
      FROM orders o
      LEFT JOIN users u ON u.id = o.created_by
      WHERE o.trashed_at IS NULL
      GROUP BY o.created_by, u.name
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `)
    topOrderCreatorsFallback = fallback.rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      count: Number(r.count),
      totalQty: 0,
    }))
  }

  if (topPickersRes.rows.length === 0) {
    const fallback = await query<{
      user_id: string
      user_name: string
      count: string
    }>(`
      SELECT
        o.picker_id AS user_id,
        COALESCE(u.name, o.picker_id, 'Desconhecido') AS user_name,
        COUNT(*)::TEXT AS count
      FROM orders o
      LEFT JOIN users u ON u.id = o.picker_id
      WHERE o.picker_id IS NOT NULL
        AND o.trashed_at IS NULL
        AND lower(o.status) IN ('em_picking', 'finalizado', 'saida_concluida')
      GROUP BY o.picker_id, u.name
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `)
    topPickersFallback = fallback.rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      count: Number(r.count),
      totalQty: 0,
    }))
  }

  // === NEW INDICATORS (from existing tables, always available) ===

  // Weight produced per person
  const weightByPersonRes = await query<{
    user_id: string
    user_name: string
    total_weight: string
    count: string
  }>(`
    SELECT
      COALESCE(o.created_by, 'unknown') AS user_id,
      COALESCE(u.name, o.created_by, 'Desconhecido') AS user_name,
      COALESCE(SUM(pt.produced_weight), 0)::TEXT AS total_weight,
      COUNT(*)::TEXT AS count
    FROM production_tasks pt
    JOIN orders o ON o.id = pt.order_id
    LEFT JOIN users u ON u.id = o.created_by
    WHERE pt.status = 'DONE'
      AND pt.produced_weight IS NOT NULL
      AND pt.produced_weight > 0
      AND o.trashed_at IS NULL
    GROUP BY o.created_by, u.name
    ORDER BY SUM(pt.produced_weight) DESC
    LIMIT 15
  `)

  // Volume separated per person
  const volumeSeparatedRes = await query<{
    user_id: string
    user_name: string
    total_qty: string
    orders_count: string
  }>(`
    SELECT
      o.picker_id AS user_id,
      COALESCE(u.name, o.picker_id, 'Desconhecido') AS user_name,
      COALESCE(SUM(oi.qty_separated), 0)::TEXT AS total_qty,
      COUNT(DISTINCT o.id)::TEXT AS orders_count
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN users u ON u.id = o.picker_id
    WHERE o.picker_id IS NOT NULL
      AND o.trashed_at IS NULL
      AND oi.qty_separated > 0
    GROUP BY o.picker_id, u.name
    ORDER BY SUM(oi.qty_separated) DESC
    LIMIT 15
  `)

  // Order completion rate per creator
  const completionRateRes = await query<{
    user_id: string
    user_name: string
    total_created: string
    total_finalized: string
  }>(`
    SELECT
      COALESCE(o.created_by, 'unknown') AS user_id,
      COALESCE(u.name, o.created_by, 'Desconhecido') AS user_name,
      COUNT(*)::TEXT AS total_created,
      SUM(CASE WHEN lower(o.status) IN ('finalizado', 'saida_concluida') THEN 1 ELSE 0 END)::TEXT AS total_finalized
    FROM orders o
    LEFT JOIN users u ON u.id = o.created_by
    WHERE o.trashed_at IS NULL
      AND o.created_by IS NOT NULL
    GROUP BY o.created_by, u.name
    ORDER BY COUNT(*) DESC
    LIMIT 15
  `)

  // Peak productivity hours (from production_tasks.completed_at)
  const peakHoursRes = await query<{
    hour: string
    tasks_completed: string
  }>(`
    SELECT
      EXTRACT(HOUR FROM pt.completed_at AT TIME ZONE 'America/Sao_Paulo')::INT AS hour,
      COUNT(*)::TEXT AS tasks_completed
    FROM production_tasks pt
    WHERE pt.status = 'DONE'
      AND pt.completed_at IS NOT NULL
    GROUP BY EXTRACT(HOUR FROM pt.completed_at AT TIME ZONE 'America/Sao_Paulo')
    ORDER BY EXTRACT(HOUR FROM pt.completed_at AT TIME ZONE 'America/Sao_Paulo') ASC
  `)

  // Pending tasks by person
  const pendingTasksRes = await query<{
    user_id: string
    user_name: string
    pending_count: string
    in_progress_count: string
  }>(`
    SELECT
      COALESCE(o.created_by, 'unknown') AS user_id,
      COALESCE(u.name, o.created_by, 'Desconhecido') AS user_name,
      SUM(CASE WHEN pt.status = 'PENDING' THEN 1 ELSE 0 END)::TEXT AS pending_count,
      SUM(CASE WHEN pt.status = 'IN_PROGRESS' THEN 1 ELSE 0 END)::TEXT AS in_progress_count
    FROM production_tasks pt
    JOIN orders o ON o.id = pt.order_id
    LEFT JOIN users u ON u.id = o.created_by
    WHERE pt.status IN ('PENDING', 'IN_PROGRESS')
      AND o.trashed_at IS NULL
    GROUP BY o.created_by, u.name
    ORDER BY SUM(CASE WHEN pt.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) DESC, SUM(CASE WHEN pt.status = 'PENDING' THEN 1 ELSE 0 END) DESC
    LIMIT 20
  `)

  return {
    topProducers:
      topProducersRes.rows.length > 0
        ? topProducersRes.rows.map((r) => ({
          userId: r.user_id,
          userName: r.user_name,
          count: Number(r.count),
          totalQty: Number(r.total_qty),
        }))
        : topProducersFallback,
    topOrderCreators:
      topOrderCreatorsRes.rows.length > 0
        ? topOrderCreatorsRes.rows.map((r) => ({
          userId: r.user_id,
          userName: r.user_name,
          count: Number(r.count),
          totalQty: Number(r.total_qty),
        }))
        : topOrderCreatorsFallback,
    topPickers:
      topPickersRes.rows.length > 0
        ? topPickersRes.rows.map((r) => ({
          userId: r.user_id,
          userName: r.user_name,
          count: Number(r.count),
          totalQty: Number(r.total_qty),
        }))
        : topPickersFallback,
    slaByPerson: slaRes.rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      avgDurationSeconds: Number(r.avg_duration),
      tasksCompleted: Number(r.tasks_completed),
    })),
    dailyProductionTrend: trendRes.rows.map((r) => ({
      date: r.date,
      totalQty: Number(r.total_qty),
      tasksCompleted: Number(r.tasks_completed),
    })),
    weightByPerson: weightByPersonRes.rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      totalWeight: Number(r.total_weight),
      count: Number(r.count),
    })),
    volumeSeparatedByPerson: volumeSeparatedRes.rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      totalQtySeparated: Number(r.total_qty),
      ordersCount: Number(r.orders_count),
    })),
    orderCompletionRate: completionRateRes.rows.map((r) => {
      const created = Number(r.total_created)
      const finalized = Number(r.total_finalized)
      return {
        userId: r.user_id,
        userName: r.user_name,
        totalCreated: created,
        totalFinalized: finalized,
        rate: created > 0 ? Math.round((finalized / created) * 100) : 0,
      }
    }),
    peakHours: peakHoursRes.rows.map((r) => ({
      hour: Number(r.hour),
      tasksCompleted: Number(r.tasks_completed),
    })),
    pendingTasksByPerson: pendingTasksRes.rows.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      pendingCount: Number(r.pending_count),
      inProgressCount: Number(r.in_progress_count),
    })),
    summary: {
      tasksCompletedToday: Number(summary?.tasks_completed_today ?? 0),
      ordersCreatedToday: Number(summary?.orders_created_today ?? 0),
      avgResponseSeconds: summary?.avg_response ? Number(summary.avg_response) : null,
    },
  }
}
