import {
  AuditEvent,
  InventoryReceipt,
  Notification,
  Order,
  OrderItem,
  PilotDb,
  ProductionTask,
  RESERVATION_TTL_MS,
  StockBalance,
  StockReservation,
} from './types';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function toIso(date = new Date()): string {
  return date.toISOString();
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}


export function availableFromBalance(balance: StockBalance): number {
  return Math.max(0, balance.onHand - balance.reservedTotal);
}

function getBalance(state: PilotDb, materialId: string): StockBalance {
  const found = state.stockBalances.find((item) => item.materialId === materialId);
  if (found) return found;
  const created: StockBalance = { materialId, onHand: 0, reservedTotal: 0 };
  state.stockBalances.push(created);
  return created;
}

function getMaterialName(state: PilotDb, materialId: string): string {
  return state.materials.find((item) => item.id === materialId)?.name ?? materialId;
}

function getMaterialUom(state: PilotDb, materialId: string): string {
  return state.materials.find((item) => item.id === materialId)?.standardUom ?? 'EA';
}

function setReadinessAndStatus(order: Order): void {
  if (order.status === 'FINALIZADO' || order.status === 'CANCELADO') return;

  const totalRequested = order.items.reduce((acc, item) => acc + item.qtyRequested, 0);
  const totalReserved = order.items.reduce((acc, item) => acc + item.qtyReservedFromStock, 0);

  if (totalReserved <= 0) {
    order.readiness = 'NOT_READY';
    order.status = 'ABERTO';
    return;
  }

  if (totalReserved >= totalRequested) {
    order.readiness = 'READY_FULL';
    order.status = order.status === 'SAIDA_CONCLUIDA' ? 'SAIDA_CONCLUIDA' : 'EM_PICKING';
    return;
  }

  order.readiness = 'READY_PARTIAL';
  order.status = order.status === 'SAIDA_CONCLUIDA' ? 'SAIDA_CONCLUIDA' : 'EM_PICKING';
}

function addAudit(order: Order, action: string, actor: string, details: string): void {
  const event: AuditEvent = {
    id: uid('aud'),
    action,
    actor,
    timestamp: toIso(),
    details,
  };
  order.auditTrail.unshift(event);
}

function addNotification(state: PilotDb, notification: Omit<Notification, 'id' | 'createdAt'>): void {
  if (notification.dedupeKey) {
    const exists = state.notifications.some((item) => item.dedupeKey === notification.dedupeKey && !item.readAt);
    if (exists) return;
  }

  state.notifications.unshift({
    id: uid('not'),
    createdAt: toIso(),
    ...notification,
  });
}

function removeOrderMaterialReservation(state: PilotDb, orderId: string, materialId: string): number {
  const matched = state.stockReservations.filter((item) => item.orderId === orderId && item.materialId === materialId);
  if (!matched.length) return 0;

  const releasedQty = matched.reduce((acc, item) => acc + item.qty, 0);
  state.stockReservations = state.stockReservations.filter(
    (item) => !(item.orderId === orderId && item.materialId === materialId)
  );

  const balance = getBalance(state, materialId);
  balance.reservedTotal = Math.max(0, balance.reservedTotal - releasedQty);
  return releasedQty;
}

function upsertProductionTasksForOrder(state: PilotDb, order: Order): void {
  const nowIso = toIso();

  order.items.forEach((item) => {
    const id = `pt-${order.id}-${item.materialId}`;
    const existing = state.productionTasks.find((task) => task.id === id);

    if (item.qtyToProduce > 0) {
      if (existing) {
        existing.qtyToProduce = item.qtyToProduce;
        existing.status = existing.status === 'DONE' ? 'PENDING' : existing.status;
        existing.updatedAt = nowIso;
      } else {
        const task: ProductionTask = {
          id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          materialId: item.materialId,
          materialName: item.materialName,
          qtyToProduce: item.qtyToProduce,
          status: 'PENDING',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        state.productionTasks.unshift(task);
      }
    }

    if (item.qtyToProduce <= 0 && existing) {
      existing.status = 'DONE';
      existing.qtyToProduce = 0;
      existing.updatedAt = nowIso;
    }
  });
}

function recalcAlerts(state: PilotDb): void {
  state.materials.forEach((material) => {
    const balance = getBalance(state, material.id);
    const available = availableFromBalance(balance);

    if (available <= material.minStock) {
      addNotification(state, {
        type: 'ESTOQUE_MINIMO',
        title: `${material.name} abaixo do minimo`,
        message: `Disponivel em ${available} ${material.standardUom}. Minimo configurado: ${material.minStock}.`,
        roleTarget: 'Input Operator',
        materialId: material.id,
        dedupeKey: `min-${material.id}`,
      });
    }

    if (available <= material.reorderPoint) {
      addNotification(state, {
        type: 'ESTOQUE_PONTO_PEDIDO',
        title: `${material.name} no ponto de pedido`,
        message: `Disponivel em ${available} ${material.standardUom}. Ponto de pedido: ${material.reorderPoint}.`,
        roleTarget: 'Manager',
        materialId: material.id,
        dedupeKey: `rop-${material.id}`,
      });
    }
  });

  const hasPending = state.productionTasks.some((task) => task.status !== 'DONE' && task.qtyToProduce > 0);
  if (hasPending) {
    addNotification(state, {
      type: 'PRODUCAO_PENDENTE',
      title: 'Tarefas de producao pendentes',
      message: 'Existem demandas de producao aguardando execucao.',
      roleTarget: 'Production Operator',
      dedupeKey: 'pending-production',
    });
  }
}

export function heartbeatOrderReservations(state: PilotDb, orderId: string): void {
  const nowIso = toIso();
  state.stockReservations = state.stockReservations.map((item) => {
    if (item.orderId !== orderId) return item;
    return {
      ...item,
      updatedAt: nowIso,
      expiresAt: addMinutes(nowIso, 5),
    };
  });
}

export function applyReservationOnQtyBlur(
  state: PilotDb,
  orderId: string,
  itemId: string,
  qtyRequested: number,
  userId: string
): void {
  const order = state.orders.find((item) => item.id === orderId);
  const user = state.users.find((item) => item.id === userId);
  if (!order || !user) return;

  const orderItem = order.items.find((item) => item.id === itemId);
  if (!orderItem) return;

  heartbeatOrderReservations(state, orderId);
  removeOrderMaterialReservation(state, orderId, orderItem.materialId);

  const balance = getBalance(state, orderItem.materialId);
  const nowIso = toIso();
  const available = availableFromBalance(balance);
  const reserveQty = Math.min(Math.max(qtyRequested, 0), available);

  orderItem.qtyRequested = Math.max(0, qtyRequested);
  orderItem.qtyReservedFromStock = reserveQty;
  orderItem.qtyToProduce = Math.max(0, orderItem.qtyRequested - reserveQty);
  orderItem.qtySeparated = Math.min(orderItem.qtySeparated, orderItem.qtyReservedFromStock);

  if (reserveQty > 0) {
    const reservation: StockReservation = {
      id: uid('res'),
      materialId: orderItem.materialId,
      orderId: order.id,
      userId,
      userName: user.name,
      qty: reserveQty,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: new Date(Date.now() + RESERVATION_TTL_MS).toISOString(),
    };

    state.stockReservations.unshift(reservation);
    balance.reservedTotal += reserveQty;
  }

  if (orderItem.qtyToProduce > 0) {
    addNotification(state, {
      type: 'RUPTURA',
      title: 'Ruptura detectada no pedido',
      message: `${order.orderNumber}: ${orderItem.materialName} com ${orderItem.qtyToProduce} para produzir.`,
      roleTarget: 'Manager',
      orderId: order.id,
      materialId: orderItem.materialId,
      dedupeKey: `rupt-${order.id}-${orderItem.materialId}`,
    });
  }

  setReadinessAndStatus(order);
  upsertProductionTasksForOrder(state, order);
  recalcAlerts(state);
}

export function cleanupExpiredReservations(state: PilotDb): number {
  const now = Date.now();
  const expired = state.stockReservations.filter((item) => new Date(item.expiresAt).getTime() <= now);
  if (!expired.length) return 0;

  expired.forEach((reservation) => {
    const balance = getBalance(state, reservation.materialId);
    balance.reservedTotal = Math.max(0, balance.reservedTotal - reservation.qty);

    const order = state.orders.find((item) => item.id === reservation.orderId);
    const orderItem = order?.items.find((item) => item.materialId === reservation.materialId);
    if (orderItem) {
      orderItem.qtyReservedFromStock = 0;
      orderItem.qtyToProduce = orderItem.qtyRequested;
      setReadinessAndStatus(order!);
      upsertProductionTasksForOrder(state, order!);
    }
  });

  const expiredIds = new Set(expired.map((item) => item.id));
  state.stockReservations = state.stockReservations.filter((item) => !expiredIds.has(item.id));
  recalcAlerts(state);
  return expired.length;
}

export function saveOrderAndRecalculate(state: PilotDb, orderId: string, actorName: string): void {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;

  order.items.forEach((item) => {
    item.qtyToProduce = Math.max(0, item.qtyRequested - item.qtyReservedFromStock);
  });

  setReadinessAndStatus(order);
  upsertProductionTasksForOrder(state, order);
  addAudit(order, 'ORDER_SAVED', actorName, 'Recalculo de estoque x producao aplicado.');
  recalcAlerts(state);
}

export function completeProductionTask(state: PilotDb, taskId: string, actorName: string): InventoryReceipt | null {
  const task = state.productionTasks.find((item) => item.id === taskId);
  if (!task || task.qtyToProduce <= 0) return null;

  task.status = 'DONE';
  task.updatedAt = toIso();

  const receipt: InventoryReceipt = {
    id: uid('rcp'),
    type: 'PRODUCTION',
    status: 'DRAFT',
    sourceRef: task.id,
    createdAt: toIso(),
    items: [
      {
        materialId: task.materialId,
        materialName: task.materialName,
        qty: task.qtyToProduce,
        uom: getMaterialUom(state, task.materialId),
      },
    ],
  };

  state.inventoryReceipts.unshift(receipt);

  const order = state.orders.find((item) => item.id === task.orderId);
  if (order) {
    addAudit(order, 'PRODUCTION_COMPLETED', actorName, `Tarefa ${task.id} concluida e recebimento em rascunho ${receipt.id} criado.`);
  }

  return receipt;
}

function allocateReceiptByDemand(state: PilotDb, materialId: string, qty: number): void {
  if (qty <= 0) return;

  const candidates = state.orders
    .filter((order) => order.status !== 'FINALIZADO' && order.status !== 'CANCELADO')
    .map((order) => ({
      order,
      item: order.items.find((item) => item.materialId === materialId && item.qtyToProduce > 0),
    }))
    .filter((entry): entry is { order: Order; item: OrderItem } => Boolean(entry.item))
    .sort((a, b) => new Date(a.order.orderDate).getTime() - new Date(b.order.orderDate).getTime());

  let remaining = qty;
  const nowIso = toIso();
  const balance = getBalance(state, materialId);

  for (const entry of candidates) {
    if (remaining <= 0) break;

    const alloc = Math.min(remaining, entry.item.qtyToProduce);
    if (alloc <= 0) continue;

    entry.item.qtyReservedFromStock += alloc;
    entry.item.qtyToProduce -= alloc;

    state.stockReservations.unshift({
      id: uid('res'),
      materialId,
      orderId: entry.order.id,
      userId: 'usr-input',
      userName: 'Sistema Autoalocacao',
      qty: alloc,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: addMinutes(nowIso, 15),
    });
    balance.reservedTotal += alloc;

    const full = entry.item.qtyToProduce === 0;
    addNotification(state, {
      type: 'ALOCACAO_DISPONIVEL',
      title: full ? 'Material totalmente disponivel' : 'Material parcialmente disponivel',
      message: `${entry.order.orderNumber} recebeu ${alloc} de ${getMaterialName(state, materialId)} para picking.`,
      roleTarget: 'Picker',
      orderId: entry.order.id,
      materialId,
    });

    setReadinessAndStatus(entry.order);
    remaining -= alloc;
  }
}

export function postReceipt(state: PilotDb, receiptId: string, autoAllocate: boolean, actorName: string): boolean {
  const receipt = state.inventoryReceipts.find((item) => item.id === receiptId);
  if (!receipt || receipt.status === 'POSTED') return false;

  receipt.items.forEach((entry) => {
    const balance = getBalance(state, entry.materialId);
    balance.onHand += entry.qty;
    if (autoAllocate) {
      allocateReceiptByDemand(state, entry.materialId, entry.qty);
    }
  });

  receipt.status = 'POSTED';
  receipt.postedAt = toIso();
  receipt.postedBy = actorName;
  receipt.autoAllocated = autoAllocate;

  recalcAlerts(state);
  return true;
}

export function updatePickingQuantity(
  state: PilotDb,
  orderId: string,
  itemId: string,
  qtySeparated: number,
  pickerName: string
): void {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;

  const item = order.items.find((row) => row.id === itemId);
  if (!item) return;

  item.qtySeparated = Math.max(0, Math.min(qtySeparated, item.qtyReservedFromStock));
  addAudit(order, 'PICKING_QTY_UPDATED', pickerName, `${item.materialName}: qtySeparated ${item.qtySeparated}.`);
}

export function completePicking(state: PilotDb, orderId: string, pickerName: string): void {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;

  order.items.forEach((item) => {
    if (item.qtySeparated <= 0) return;

    const balance = getBalance(state, item.materialId);
    balance.onHand = Math.max(0, balance.onHand - item.qtySeparated);
    balance.reservedTotal = Math.max(0, balance.reservedTotal - item.qtySeparated);

    let remainingToRelease = item.qtySeparated;
    state.stockReservations = state.stockReservations
      .map((reservation) => {
        if (reservation.orderId !== orderId || reservation.materialId !== item.materialId || remainingToRelease <= 0) {
          return reservation;
        }

        const deduction = Math.min(remainingToRelease, reservation.qty);
        remainingToRelease -= deduction;
        return { ...reservation, qty: reservation.qty - deduction, updatedAt: toIso() };
      })
      .filter((reservation) => reservation.qty > 0);
  });

  const fullySeparated = order.items.every((item) => item.qtySeparated >= item.qtyRequested);
  order.status = fullySeparated ? 'FINALIZADO' : 'SAIDA_CONCLUIDA';
  if (order.status === 'FINALIZADO') {
    order.readiness = 'READY_FULL';
  }

  addAudit(order, 'PICKING_COMPLETED', pickerName, `Pedido concluido com status ${order.status}.`);

  addNotification(state, {
    type: 'SISTEMA',
    title: 'Picking concluido',
    message: `${order.orderNumber} finalizado em picking (${order.status}).`,
    roleTarget: 'Manager',
    orderId: order.id,
  });

  recalcAlerts(state);
}

export function countOpenDemandsByMaterial(state: PilotDb, materialId: string): number {
  return state.orders.reduce((acc, order) => {
    const pending = order.items
      .filter((item) => item.materialId === materialId)
      .reduce((sum, item) => sum + Math.max(0, item.qtyToProduce), 0);
    return acc + pending;
  }, 0);
}

export function markNotificationRead(state: PilotDb, notificationId: string, read: boolean): void {
  const target = state.notifications.find((item) => item.id === notificationId);
  if (!target) return;
  target.readAt = read ? toIso() : undefined;
}

export function createOrderDraft(state: PilotDb, actorUserId: string): Order {
  const count = state.orders.length + 1;
    const draft: Order = {
    id: uid('ord'),
    orderNumber: `2026-02-${String(10000 + count).padStart(5, '0')}`,
    clientId: state.clients[0]?.id ?? 'cli-001',
    clientName: state.clients[0]?.name ?? 'Cliente',
    status: 'RASCUNHO',
    readiness: 'NOT_READY',
    orderDate: toIso(),
    dueDate: addMinutes(toIso(), 24 * 60),
    createdBy: actorUserId,
    volumeCount: 1,
    labelPrintCount: 0,
    items: [],
    auditTrail: [],
  };

  state.orders.unshift(draft);
  return draft;
}

export function addItemToOrder(state: PilotDb, orderId: string, materialId: string): void {
  const order = state.orders.find((item) => item.id === orderId);
  const material = state.materials.find((item) => item.id === materialId);
  if (!order || !material) return;

  const item: OrderItem = {
    id: uid('itm'),
    materialId,
    materialName: material.name,
    uom: material.standardUom,
    color: material.colorOptions[0] ?? 'Padrao',
    qtyRequested: 0,
    qtyReservedFromStock: 0,
    qtyToProduce: 0,
    qtySeparated: 0,
  };

  order.items.push(item);
  // Auto-adjust volumes to number of items
  order.volumeCount = Math.max(1, order.items.length);
}

export function removeOrderItem(state: PilotDb, orderId: string, itemId: string): void {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return;

  const item = order.items.find((it) => it.id === itemId);
  if (!item) return;

  // Release reservations for this item
  removeOrderMaterialReservation(state, orderId, item.materialId);

  order.items = order.items.filter((it) => it.id !== itemId);
  // Recalculate volumes
  order.volumeCount = Math.max(1, order.items.length);
}

export function removeOrder(state: PilotDb, orderId: string): void {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;

  // Release reservations for the order's items and mark the order as trashed
  order.items.forEach((item) => {
    removeOrderMaterialReservation(state, orderId, item.materialId);
  });

  // Remove any production tasks related to this order
  state.productionTasks = state.productionTasks.filter((task) => task.orderId !== orderId);

  order.status = 'CANCELADO';
  order.trashedAt = toIso();
}

export function purgeOrder(state: PilotDb, orderId: string): void {
  // Permanently remove an order (used by trash UI)
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;

  // Ensure reservations released
  order.items.forEach((item) => {
    removeOrderMaterialReservation(state, orderId, item.materialId);
  });

  state.productionTasks = state.productionTasks.filter((task) => task.orderId !== orderId);
  state.orders = state.orders.filter((item) => item.id !== orderId);
}

export function applyMrpSuggestion(state: PilotDb, suggestionId: string): void {
  const suggestion = state.mrpSuggestions.find((item) => item.id === suggestionId);
  if (!suggestion || suggestion.appliedAt) return;

  const material = state.materials.find((item) => item.id === suggestion.materialId);
  if (!material) return;

  material.reorderPoint = suggestion.suggestedReorderPoint;
  material.minStock = suggestion.suggestedMinStock;
  suggestion.appliedAt = toIso();
}

export function registerLabelPrint(state: PilotDb, orderId: string, actorName: string): void {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  order.labelPrintCount += 1;
  const isReprint = order.labelPrintCount > 1;
  addAudit(
    order,
    isReprint ? 'LABEL_REPRINTED' : 'LABEL_PRINTED',
    actorName,
    `${order.volumeCount} etiqueta(s) ${isReprint ? 'reimpressas' : 'impressas'}.`
  );
}

export function createMrpSuggestion(
  state: PilotDb,
  materialId: string,
  reorderPoint: number,
  minStock: number,
  qty: number,
  rationale: string
): void {
  state.mrpSuggestions.unshift({
    id: uid('mrp'),
    materialId,
    suggestedReorderPoint: reorderPoint,
    suggestedMinStock: minStock,
    suggestedQty: qty,
    rationale,
    createdAt: toIso(),
  });
}

export function initializeState(state: PilotDb): void {
  cleanupExpiredReservations(state);
  state.orders.forEach((order) => setReadinessAndStatus(order));
  recalcAlerts(state);
}
