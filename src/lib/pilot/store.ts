'use client';

import { create } from 'zustand';
import { buildSeedData, defaultCurrentUserRole } from './seed';
import { LocalPilotRepository } from './local-repository';
import { PilotDb, Role, Material } from './types';
import {
  addItemToOrder,
  applyMrpSuggestion,
  applyReservationOnQtyBlur,
  cleanupExpiredReservations,
  completePicking,
  completeProductionTask,
  countOpenDemandsByMaterial,
  createMrpSuggestion,
  createOrderDraft,
  heartbeatOrderReservations,
  initializeState,
  markNotificationRead,
  postReceipt,
  removeOrder,
  registerLabelPrint,
  saveOrderAndRecalculate,
  updatePickingQuantity,
} from './engine';

const repository = new LocalPilotRepository();

function initialDb(): PilotDb {
  if (typeof window === 'undefined') return buildSeedData();
  const loaded = repository.load();
  initializeState(loaded);
  repository.save(loaded);
  return loaded;
}

type PilotState = {
  db: PilotDb;
  currentUserId: string;
  currentRole: Role;
  busyReceipts: Record<string, boolean>;
  setCurrentRole: (role: Role) => void;
  resetDemoData: () => void;
  createDraftOrder: () => string;
  deleteOrder: (orderId: string) => void;
  addItem: (orderId: string, materialId: string) => void;
  updateOrderMeta: (orderId: string, payload: { clientId?: string; dueDate?: string; volumeCount?: number }) => void;
  updateOrderItemField: (
    orderId: string,
    itemId: string,
    payload: { qtyRequested?: number; color?: string; itemCondition?: string; conditionTemplateName?: string }
  ) => void;
  updateOrderClientName: (orderId: string, clientName: string) => void;
  addItemCondition: (orderId: string, itemId: string) => void;
  updateItemConditionField: (
    orderId: string,
    itemId: string,
    index: number,
    payload: { key?: string; value?: string }
  ) => void;
  removeItemCondition: (orderId: string, itemId: string, index: number) => void;
  onQtyBlurReserve: (orderId: string, itemId: string, qtyRequested: number) => void;
  saveOrder: (orderId: string) => void;
  heartbeatOrder: (orderId: string) => void;
  runMaintenance: () => void;
  startProductionTask: (taskId: string) => void;
  completeProduction: (taskId: string) => void;
  postInventoryReceipt: (receiptId: string, autoAllocate: boolean) => void;
  markNotification: (notificationId: string, read: boolean) => void;
  updateSeparatedQty: (orderId: string, itemId: string, qty: number) => void;
  concludePicking: (orderId: string) => void;
  registerLabelPrint: (orderId: string) => void;
  createSuggestion: (
    materialId: string,
    suggestedReorderPoint: number,
    suggestedMinStock: number,
    suggestedQty: number,
    rationale: string
  ) => void;
  applySuggestion: (suggestionId: string) => void;
  countOpenDemands: (materialId: string) => number;
  addMaterial: (payload: {
    name: string;
    standardUom: string;
    minStock: number;
    reorderPoint: number;
    setupTimeMinutes: number;
    productionTimePerUnitMinutes: number;
    colorOptions: string[];
  }) => void;
  updateMaterial: (materialId: string, payload: Partial<Material>) => void;
};

function persist(db: PilotDb) {
  repository.save(db);
}

function setDb(get: () => PilotState, db: PilotDb) {
  initializeState(db);
  persist(db);
}

export const usePilotStore = create<PilotState>((set, get) => ({
  db: initialDb(),
  currentUserId: 'usr-seller',
  currentRole: defaultCurrentUserRole,
  busyReceipts: {},
  setCurrentRole: (role) => {
    const user = get().db.users.find((item) => item.role === role);
    if (!user) return;
    set({ currentRole: role, currentUserId: user.id });
  },
  resetDemoData: () => {
    const db = repository.reset();
    initializeState(db);
    set({ db, currentRole: defaultCurrentUserRole, currentUserId: 'usr-seller', busyReceipts: {} });
  },
  createDraftOrder: () => {
    const state = get();
    const db = structuredClone(state.db);
    const order = createOrderDraft(db, state.currentUserId);
    setDb(get, db);
    set({ db });
    return order.id;
  },
  deleteOrder: (orderId) => {
    const db = structuredClone(get().db);
    removeOrder(db, orderId);
    setDb(get, db);
    set({ db });
  },
  addItem: (orderId, materialId) => {
    const db = structuredClone(get().db);
    addItemToOrder(db, orderId, materialId);
    persist(db);
    set({ db });
  },
  updateOrderMeta: (orderId, payload) => {
    const db = structuredClone(get().db);
    const order = db.orders.find((item) => item.id === orderId);
    if (!order) return;

    if (payload.clientId) {
      order.clientId = payload.clientId;
      const client = db.clients.find((item) => item.id === payload.clientId);
      if (client) order.clientName = client.name;
    }
    if (payload.dueDate) order.dueDate = payload.dueDate;
    if (payload.volumeCount !== undefined) order.volumeCount = Math.max(1, payload.volumeCount);

    persist(db);
    set({ db });
  },
  updateOrderItemField: (orderId, itemId, payload) => {
    const db = structuredClone(get().db);
    const order = db.orders.find((item) => item.id === orderId);
    const row = order?.items.find((item) => item.id === itemId);
    if (!order || !row) return;

    if (payload.qtyRequested !== undefined) row.qtyRequested = Math.max(0, payload.qtyRequested);
    if (payload.color !== undefined) row.color = payload.color;
    if (payload.itemCondition !== undefined) row.itemCondition = payload.itemCondition;
    if (payload.conditionTemplateName !== undefined) row.conditionTemplateName = payload.conditionTemplateName;

    heartbeatOrderReservations(db, orderId);
    persist(db);
    set({ db });
  },
  updateOrderClientName: (orderId, clientName) => {
    const db = structuredClone(get().db);
    const order = db.orders.find((item) => item.id === orderId);
    if (!order) return;
    order.clientName = clientName;
    const match = db.clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase());
    if (match) order.clientId = match.id;
    else order.clientId = '';
    persist(db);
    set({ db });
  },
  addItemCondition: (orderId, itemId) => {
    const db = structuredClone(get().db);
    const order = db.orders.find((o) => o.id === orderId);
    const row = order?.items.find((it) => it.id === itemId);
    if (!order || !row) return;
    if (!row.conditions) row.conditions = [];
    row.conditions.push({ key: '', value: '' });
    persist(db);
    set({ db });
  },
  updateItemConditionField: (orderId, itemId, index, payload) => {
    const db = structuredClone(get().db);
    const order = db.orders.find((o) => o.id === orderId);
    const row = order?.items.find((it) => it.id === itemId);
    if (!order || !row || !row.conditions) return;
    const cond = row.conditions[index];
    if (!cond) return;
    if (payload.key !== undefined) cond.key = payload.key;
    if (payload.value !== undefined) cond.value = payload.value;
    persist(db);
    set({ db });
  },
  removeItemCondition: (orderId, itemId, index) => {
    const db = structuredClone(get().db);
    const order = db.orders.find((o) => o.id === orderId);
    const row = order?.items.find((it) => it.id === itemId);
    if (!order || !row || !row.conditions) return;
    row.conditions.splice(index, 1);
    persist(db);
    set({ db });
  },
  onQtyBlurReserve: (orderId, itemId, qtyRequested) => {
    const state = get();
    const db = structuredClone(state.db);
    applyReservationOnQtyBlur(db, orderId, itemId, qtyRequested, state.currentUserId);
    persist(db);
    set({ db });
  },
  saveOrder: (orderId) => {
    const state = get();
    const db = structuredClone(state.db);
    const actor = db.users.find((item) => item.id === state.currentUserId)?.name ?? 'Usuario';
    saveOrderAndRecalculate(db, orderId, actor);
    const order = db.orders.find((item) => item.id === orderId);
    if (order && order.status === 'RASCUNHO') {
      order.status = 'ABERTO';
    }
    persist(db);
    set({ db });
  },
  heartbeatOrder: (orderId) => {
    const db = structuredClone(get().db);
    heartbeatOrderReservations(db, orderId);
    persist(db);
    set({ db });
  },
  runMaintenance: () => {
    const db = structuredClone(get().db);
    const changed = cleanupExpiredReservations(db);
    if (!changed) return;
    persist(db);
    set({ db });
  },
  startProductionTask: (taskId) => {
    const db = structuredClone(get().db);
    const task = db.productionTasks.find((item) => item.id === taskId);
    if (!task || task.status === 'DONE') return;
    task.status = 'IN_PROGRESS';
    task.updatedAt = new Date().toISOString();
    persist(db);
    set({ db });
  },
  completeProduction: (taskId) => {
    const state = get();
    const db = structuredClone(state.db);
    const actor = db.users.find((item) => item.id === state.currentUserId)?.name ?? 'Operador';
    completeProductionTask(db, taskId, actor);
    persist(db);
    set({ db });
  },
  postInventoryReceipt: (receiptId, autoAllocate) => {
    const state = get();
    if (state.busyReceipts[receiptId]) return;

    set({ busyReceipts: { ...state.busyReceipts, [receiptId]: true } });

    const db = structuredClone(get().db);
    const actor = db.users.find((item) => item.id === get().currentUserId)?.name ?? 'Operador de Entrada';
    postReceipt(db, receiptId, autoAllocate, actor);
    persist(db);

    const busy = { ...get().busyReceipts };
    delete busy[receiptId];
    set({ db, busyReceipts: busy });
  },
  markNotification: (notificationId, read) => {
    const db = structuredClone(get().db);
    markNotificationRead(db, notificationId, read);
    persist(db);
    set({ db });
  },
  updateSeparatedQty: (orderId, itemId, qty) => {
    const state = get();
    const db = structuredClone(state.db);
    const actor = db.users.find((item) => item.id === state.currentUserId)?.name ?? 'Separador';
    updatePickingQuantity(db, orderId, itemId, qty, actor);
    persist(db);
    set({ db });
  },
  concludePicking: (orderId) => {
    const state = get();
    const db = structuredClone(state.db);
    const actor = db.users.find((item) => item.id === state.currentUserId)?.name ?? 'Separador';
    completePicking(db, orderId, actor);
    persist(db);
    set({ db });
  },
  registerLabelPrint: (orderId) => {
    const state = get();
    const db = structuredClone(state.db);
    const actor = db.users.find((item) => item.id === state.currentUserId)?.name ?? 'Separador';
    registerLabelPrint(db, orderId, actor);
    persist(db);
    set({ db });
  },
  createSuggestion: (materialId, suggestedReorderPoint, suggestedMinStock, suggestedQty, rationale) => {
    const db = structuredClone(get().db);
    createMrpSuggestion(db, materialId, suggestedReorderPoint, suggestedMinStock, suggestedQty, rationale);
    persist(db);
    set({ db });
  },
  applySuggestion: (suggestionId) => {
    const db = structuredClone(get().db);
    applyMrpSuggestion(db, suggestionId);
    persist(db);
    set({ db });
  },
  addMaterial: (payload) => {
    const db = structuredClone(get().db);
    // generate next MAT id
    let next = db.materials.length + 1;
    let id = `MAT-${String(next).padStart(3, '0')}`;
    while (db.materials.find((m) => m.id === id)) {
      next += 1;
      id = `MAT-${String(next).padStart(3, '0')}`;
    }

    const material: Material = {
      id,
      name: payload.name,
      standardUom: payload.standardUom,
      minStock: payload.minStock || 0,
      reorderPoint: payload.reorderPoint || 0,
      setupTimeMinutes: payload.setupTimeMinutes || 0,
      productionTimePerUnitMinutes: payload.productionTimePerUnitMinutes || 0,
      colorOptions: payload.colorOptions || [],
    };

    db.materials.push(material);
    persist(db);
    set({ db });
  },
  updateMaterial: (materialId, payload) => {
    const db = structuredClone(get().db);
    const mat = db.materials.find((m) => m.id === materialId);
    if (!mat) return;
    Object.assign(mat, payload);
    persist(db);
    set({ db });
  },
  countOpenDemands: (materialId) => {
    return countOpenDemandsByMaterial(get().db, materialId);
  },
}));

export function usePilotDerived() {
  const db = usePilotStore((state) => state.db);
  const now = Date.now();

  const materialsById = Object.fromEntries(db.materials.map((item) => [item.id, item]));
  const stockView = db.stockBalances.map((balance) => {
    const material = materialsById[balance.materialId];
    const available = Math.max(0, balance.onHand - balance.reservedTotal);
    const activeReservations = db.stockReservations
      .filter((item) => item.materialId === balance.materialId)
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

    return {
      ...balance,
      material,
      available,
      activeReservations,
    };
  });

  const unreadCount = db.notifications.filter((item) => !item.readAt).length;
  const expiringSoon = db.stockReservations.filter((item) => new Date(item.expiresAt).getTime() - now < 60000).length;

  return {
    stockView,
    unreadCount,
    expiringSoon,
  };
}
