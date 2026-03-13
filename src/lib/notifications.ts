import { Pool, PoolClient } from 'pg'
import { getPool, query as dbQuery } from '@/lib/db'
import { NotificationType, Role } from '@/lib/domain/types'
import { getTenantFromSession } from './auth'
import { publishRealtimeEvent } from './pubsub'

export type NotificationDraft = {
  type: NotificationType
  title: string
  message?: string
  roleTarget?: Role
  userTarget?: string
  orderId?: number
  materialId?: number
  dedupeKey?: string
  tenantId?: string
}

async function execQuery(query: string, params: unknown[], executor?: Pool | PoolClient) {
  const client = executor ?? getPool()
  await client.query(query, params)
}

export async function publishNotification(draft: NotificationDraft, executor?: Pool | PoolClient) {
  const tenantId = draft.tenantId || (await getTenantFromSession())
  
  const params = [
    draft.type,
    draft.title,
    draft.message ?? null,
    draft.roleTarget ?? null,
    draft.userTarget ?? null,
    draft.orderId ?? null,
    draft.materialId ?? null,
    tenantId,
  ]

  const client = executor ?? getPool()
  
  // Set tenant context if using a pool client
  if (tenantId && executor && 'escapeLiteral' in executor) {
    try {
      await executor.query(`SET app.current_tenant_id = ${executor.escapeLiteral(tenantId)}`)
    } catch { /* ignore */ }
  }

  if (draft.dedupeKey) {
    const updateQuery = `
      UPDATE notifications SET
        type = $1,
        title = $2,
        message = $3,
        role_target = $4,
        user_target = $5,
        order_id = $6,
        material_id = $7,
        created_at = now(),
        read_at = NULL
      WHERE dedupe_key = $9 AND tenant_id = $8
    `

    const updateRes = await client.query(updateQuery, [...params, draft.dedupeKey])
    if (updateRes.rowCount > 0) {
      await publishRealtimeEvent('NOTIFICATION_CREATED', { type: draft.type, title: draft.title, tenantId })
      return
    }

    const insertQuery = `
      INSERT INTO notifications (type, title, message, role_target, user_target, order_id, material_id, tenant_id, dedupe_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `
    await client.query(insertQuery, [...params, draft.dedupeKey])
    await publishRealtimeEvent('NOTIFICATION_CREATED', { type: draft.type, title: draft.title, tenantId })
    return
  }
  const insertQuery = `
    INSERT INTO notifications (type, title, message, role_target, user_target, order_id, material_id, tenant_id, dedupe_key)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL)
  `
  await execQuery(insertQuery, params, executor)
  await publishRealtimeEvent('NOTIFICATION_CREATED', { type: draft.type, title: draft.title, tenantId })
}

const formatQty = (value: number) => {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

const buildOrderLabel = (orderId: number, orderNumber?: string | null) => {
  const parsed = String(orderNumber ?? '').trim()
  return parsed ? parsed : `O-${orderId}`
}

export type OrderStage = 'PRODUCAO_INICIADA' | 'PRODUCAO_RESERVADA' | 'PEDIDO_CONCLUIDO'

const orderStageMeta: Record<OrderStage, { title: string; defaultMessage: (orderLabel: string) => string }> = {
  PRODUCAO_INICIADA: {
    title: 'Produção iniciada para',
    defaultMessage: (label) => `Pedido ${label} entrou em produção.`,
  },
  PRODUCAO_RESERVADA: {
    title: 'Produção liberada para',
    defaultMessage: (label) => `Pedido ${label} foi produzido e reservado para separação.`,
  },
  PEDIDO_CONCLUIDO: {
    title: 'Pedido concluído',
    defaultMessage: (label) => `Pedido ${label} foi finalizado.`,
  },
}

export async function notifyOrderStage(
  params: {
    orderId: number
    orderNumber?: string | null
    stage: OrderStage
    userTarget?: string | null
    detail?: string
  },
  executor?: Pool | PoolClient
) {
  if (!params.userTarget) return
  const orderLabel = buildOrderLabel(params.orderId, params.orderNumber)
  const meta = orderStageMeta[params.stage]
  const title = `${meta.title} ${orderLabel}`
  const message = params.detail ?? meta.defaultMessage(orderLabel)
  await publishNotification(
    {
      type: 'PEDIDO_FLUXO',
      title,
      message,
      userTarget: params.userTarget,
      orderId: params.orderId,
      dedupeKey: `order_stage_${params.orderId}_${params.stage}`,
    },
    executor
  )
}

export async function notifyProductionTaskCreated(
  params: {
    orderId: number
    materialId: number
    orderNumber?: string | null
    materialName?: string | null
    qty: number
  },
  executor?: Pool | PoolClient
) {
  const title = `Nova tarefa de producao${params.orderNumber ? ` para ${params.orderNumber}` : ''}`
  const message = `Produzir ${params.materialName ?? `M-${params.materialId}`} (${formatQty(params.qty)}) para o pedido ${buildOrderLabel(
    params.orderId,
    params.orderNumber
  )}.`
  await publishNotification(
    {
      type: 'PRODUCAO_PENDENTE',
      title,
      message,
      roleTarget: 'Production Operator',
      orderId: params.orderId,
      materialId: params.materialId,
      dedupeKey: `production_task_${params.orderId}_${params.materialId}`,
    },
    executor
  )
}

export async function notifyAllocationAvailable(
  params: {
    orderId: number
    materialId: number
    orderNumber?: string | null
    materialName?: string | null
    qty: number
  },
  executor?: Pool | PoolClient
) {
  const orderLabel = buildOrderLabel(params.orderId, params.orderNumber)
  const title = `Pedido ${orderLabel} liberado para separacao`
  const message = `${params.materialName ?? `M-${params.materialId}`} (${formatQty(params.qty)}) reservado por 5 minutos para o pedido ${orderLabel}.`
  await publishNotification(
    {
      type: 'ALOCACAO_DISPONIVEL',
      title,
      message,
      roleTarget: 'Picker',
      orderId: params.orderId,
      materialId: params.materialId,
      dedupeKey: `allocation_${params.orderId}_${params.materialId}`,
    },
    executor
  )
}

export async function notifyOrderProduced(
  params: {
    orderId: number
    orderNumber?: string | null
    materialId?: number
    materialName?: string | null
    qty: number
    userTarget?: string | null
  },
  executor?: Pool | PoolClient
) {
  await notifyOrderStage(
    {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      stage: 'PRODUCAO_RESERVADA',
      userTarget: params.userTarget,
      detail: `${params.materialName ?? 'Material'} (${formatQty(params.qty)}) pronto para ${buildOrderLabel(
        params.orderId,
        params.orderNumber
      )} e reservado por 5 minutos.`,
    },
    executor
  )
}

export async function notifyOrderCompleted(
  params: {
    orderId: number
    orderNumber?: string | null
    status: string
    userTarget?: string | null
  },
  executor?: Pool | PoolClient
) {
  await notifyOrderStage(
    {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      stage: 'PEDIDO_CONCLUIDO',
      userTarget: params.userTarget,
      detail: `Status final do pedido ${buildOrderLabel(params.orderId, params.orderNumber)}: ${params.status}.`,
    },
    executor
  )
}
