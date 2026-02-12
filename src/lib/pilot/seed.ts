import { InventoryReceipt, PilotDb, RESERVATION_TTL_MS, Role } from './types';

const now = new Date('2026-02-11T10:00:00.000Z');

function iso(offsetMinutes: number): string {
  return new Date(now.getTime() + offsetMinutes * 60000).toISOString();
}

function orderNumber(index: number): string {
  return `2026-02-${String(index).padStart(5, '0')}`;
}


const users: PilotDb['users'] = [
  { id: 'usr-admin', name: 'Ana Admin', email: 'ana.admin@supplyflow.local', role: 'Admin' },
  { id: 'usr-manager', name: 'Marcos Gestor', email: 'marcos.manager@supplyflow.local', role: 'Manager' },
  { id: 'usr-seller', name: 'Sofia Vendas', email: 'sofia.seller@supplyflow.local', role: 'Seller' },
  { id: 'usr-seller-2', name: 'Lucas Vendas', email: 'lucas.seller@supplyflow.local', role: 'Seller' },
  { id: 'usr-seller-3', name: 'Mariana Vendas', email: 'mariana.seller@supplyflow.local', role: 'Seller' },
  { id: 'usr-input', name: 'Iris Entrada', email: 'iris.input@supplyflow.local', role: 'Input Operator' },
  { id: 'usr-input-2', name: 'Clara Entrada', email: 'clara.input@supplyflow.local', role: 'Input Operator' },
  { id: 'usr-prod', name: 'Paulo Producao', email: 'paulo.production@supplyflow.local', role: 'Production Operator' },
  { id: 'usr-picker', name: 'Pedro Separacao', email: 'pedro.picker@supplyflow.local', role: 'Picker' },
  { id: 'usr-picker-2', name: 'Rafael Separacao', email: 'rafael.picker@supplyflow.local', role: 'Picker' },
];

const clients: PilotDb['clients'] = [
  { id: 'cli-001', name: 'Atlas Energia', contact: 'compras@atlas.com' },
  { id: 'cli-002', name: 'Nova Medical', contact: 'supply@novamed.com' },
  { id: 'cli-003', name: 'Orbita Log', contact: 'ops@orbita.com' },
  { id: 'cli-004', name: 'Pulsar Mobility', contact: 'demand@pulsar.com' },
  { id: 'cli-005', name: 'Vita Labs', contact: 'vendas@vita.com' },
];

const uoms: PilotDb['uoms'] = [
  { id: 'uom-ea', code: 'EA', description: 'Unidade' },
  { id: 'uom-kg', code: 'KG', description: 'Quilograma' },
  { id: 'uom-m', code: 'M', description: 'Metro' },
  { id: 'uom-l', code: 'L', description: 'Litro' },
  { id: 'uom-box', code: 'BOX', description: 'Caixa' },
];

const materials: PilotDb['materials'] = [
  {
    id: 'MAT-001',
    name: 'Microcontrolador X1',
    standardUom: 'EA',
    minStock: 120,
    reorderPoint: 180,
    setupTimeMinutes: 20,
    productionTimePerUnitMinutes: 2,
    colorOptions: ['Preto', 'Cinza'],
  },
  {
    id: 'MAT-002',
    name: 'Tela Industrial 7"',
    standardUom: 'EA',
    minStock: 90,
    reorderPoint: 140,
    setupTimeMinutes: 35,
    productionTimePerUnitMinutes: 3,
    colorOptions: ['Preto', 'Azul'],
  },
  {
    id: 'MAT-003',
    name: 'Carcaca Modelo A',
    standardUom: 'EA',
    minStock: 250,
    reorderPoint: 320,
    setupTimeMinutes: 15,
    productionTimePerUnitMinutes: 1,
    colorOptions: ['Branco', 'Preto', 'Vermelho'],
  },
  {
    id: 'MAT-004',
    name: 'Bateria Li-Ion 5Ah',
    standardUom: 'EA',
    minStock: 140,
    reorderPoint: 220,
    setupTimeMinutes: 40,
    productionTimePerUnitMinutes: 4,
    colorOptions: ['Preto'],
  },
  {
    id: 'MAT-005',
    name: 'Cabo Cobre 10m',
    standardUom: 'M',
    minStock: 3000,
    reorderPoint: 5000,
    setupTimeMinutes: 10,
    productionTimePerUnitMinutes: 0.2,
    colorOptions: ['Laranja', 'Preto'],
  },
  {
    id: 'MAT-006',
    name: 'Conector P4',
    standardUom: 'EA',
    minStock: 500,
    reorderPoint: 700,
    setupTimeMinutes: 5,
    productionTimePerUnitMinutes: 0.3,
    colorOptions: ['Prata'],
  },
];

const stockBalances: PilotDb['stockBalances'] = [
  { materialId: 'MAT-001', onHand: 220, reservedTotal: 40 },
  { materialId: 'MAT-002', onHand: 150, reservedTotal: 20 },
  { materialId: 'MAT-003', onHand: 380, reservedTotal: 90 },
  { materialId: 'MAT-004', onHand: 95, reservedTotal: 15 },
  { materialId: 'MAT-005', onHand: 7200, reservedTotal: 1200 },
  { materialId: 'MAT-006', onHand: 640, reservedTotal: 70 },
];

const sellerIds = users.filter((u) => u.role === 'Seller').map((u) => u.id);
const pickerIds = users.filter((u) => u.role === 'Picker').map((u) => u.id);

function makeOrder(index: number): PilotDb['orders'][number] {
  const client = clients[index % clients.length];
  const m1 = materials[index % materials.length];
  const m2 = materials[(index + 2) % materials.length];

  const qty1 = 20 + (index % 5) * 10;
  const qty2 = 15 + (index % 4) * 8;

  const reserved1 = Math.floor(qty1 * 0.6);
  const reserved2 = Math.floor(qty2 * 0.5);

  // diversify statuses for dashboard visualization
  const status = index % 6 === 0 ? 'FINALIZADO' : index % 4 === 0 ? 'EM_PICKING' : 'ABERTO';
  const readiness = status === 'FINALIZADO' ? 'READY_FULL' : status === 'EM_PICKING' ? 'READY_PARTIAL' : reserved1 + reserved2 > 0 ? 'READY_PARTIAL' : 'NOT_READY';

  // simulate separated quantities for some orders
  const separatedForFinalized = (requested: number) => requested;
  const separatedForPicking = (requested: number, reserved: number) => Math.min(requested, Math.floor(reserved * 0.6));

  const itm1Separated = status === 'FINALIZADO' ? separatedForFinalized(qty1) : status === 'EM_PICKING' ? separatedForPicking(qty1, reserved1) : 0;
  const itm2Separated = status === 'FINALIZADO' ? separatedForFinalized(qty2) : status === 'EM_PICKING' ? separatedForPicking(qty2, reserved2) : 0;

  return {
    id: `ord-${String(index).padStart(3, '0')}`,
    orderNumber: orderNumber(index),
    clientId: client.id,
    clientName: client.name,
    status,
    readiness,
    orderDate: iso(-index * 180),
    dueDate: iso(600 + index * 60),
    createdBy: sellerIds[index % sellerIds.length],
    pickerId: status === 'EM_PICKING' ? pickerIds[index % pickerIds.length] : undefined,
    volumeCount: 1 + (index % 3),
    labelPrintCount: 0,
    items: [
      {
        id: `itm-${index}-1`,
        materialId: m1.id,
        materialName: m1.name,
        uom: m1.standardUom,
        color: m1.colorOptions[0],
        qtyRequested: qty1,
        qtyReservedFromStock: reserved1,
        qtyToProduce: qty1 - reserved1,
        qtySeparated: itm1Separated,
        itemCondition: 'Sem avarias',
        conditions: [
          { key: 'Observacao', value: 'Sem avarias' }
        ],
      },
      {
        id: `itm-${index}-2`,
        materialId: m2.id,
        materialName: m2.name,
        uom: m2.standardUom,
        color: m2.colorOptions[0],
        qtyRequested: qty2,
        qtyReservedFromStock: reserved2,
        qtyToProduce: qty2 - reserved2,
        qtySeparated: itm2Separated,
        conditions: [],
      },
    ],
    auditTrail: [
      {
        id: `aud-${index}-0`,
        action: 'ORDER_CREATED',
        actor: 'Sofia Vendas',
        timestamp: iso(-index * 180),
        details: 'Pedido criado no piloto',
      },
    ],
  };
}

const orders = Array.from({ length: 30 }).map((_, i) => makeOrder(i + 1));

const stockReservations: PilotDb['stockReservations'] = orders.flatMap((order, orderIdx) =>
  order.items
    .filter((item) => item.qtyReservedFromStock > 0)
    .map((item, itemIdx) => ({
      id: `res-${order.id}-${item.id}`,
      materialId: item.materialId,
      orderId: order.id,
      userId: 'usr-seller',
      userName: 'Sofia Vendas',
      qty: item.qtyReservedFromStock,
      createdAt: iso(-orderIdx * 120),
      updatedAt: iso(-orderIdx * 80),
      expiresAt: new Date(now.getTime() + RESERVATION_TTL_MS + itemIdx * 60000).toISOString(),
    }))
);

const productionTasks: PilotDb['productionTasks'] = orders
  .flatMap((order, orderIdx) =>
    order.items
      .filter((item) => item.qtyToProduce > 0)
      .map((item) => ({
        id: `pt-${order.id}-${item.materialId}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        materialId: item.materialId,
        materialName: item.materialName,
        qtyToProduce: item.qtyToProduce,
        status: orderIdx % 6 === 0 ? ('DONE' as const) : 'PENDING' as const,
        createdAt: order.orderDate,
        updatedAt: orderIdx % 6 === 0 ? iso(-orderIdx * 30) : order.orderDate,
      }))
  )
  .slice(0, 20);

// Cria recebimentos de estoque (alguns postados por operadores diferentes)
const inventoryReceipts: PilotDb['inventoryReceipts'] = Array.from({ length: 12 }).map((_, i) => {
  const mat = materials[i % materials.length];
  const created = iso(-i * 240); // spaced every 4 hours
  const posted = i % 2 === 0 ? iso(-i * 120) : undefined; // half are posted
  const poster = i % 3 === 0 ? 'usr-input' : i % 3 === 1 ? 'usr-input-2' : 'usr-prod';
  const postedBy = posted ? poster : undefined;

  return {
    id: `rcpt-${String(i + 1).padStart(3, '0')}`,
    type: 'PRODUCTION',
    status: posted ? 'POSTED' : 'DRAFT',
    items: [
      { materialId: mat.id, materialName: mat.name, qty: 5 + (i % 7) * 5, uom: mat.standardUom },
    ],
    sourceRef: `PO-${1000 + i}`,
    createdAt: created,
    postedAt: posted,
    postedBy: postedBy,
    autoAllocated: i % 4 === 0,
  } as InventoryReceipt;
});

// Populate several notifications (some unread)
const notifications: PilotDb['notifications'] = Array.from({ length: 7 }).map((_, i) => ({
  id: `not-${String(i + 1).padStart(3, '0')}`,
  type: i % 3 === 0 ? 'ESTOQUE_MINIMO' : i % 3 === 1 ? 'PRODUCAO_PENDENTE' : 'SISTEMA',
  title: i % 3 === 0 ? 'Material abaixo do minimo' : i % 3 === 1 ? 'Tarefa de producao atrasada' : 'Novo comentario',
  message: i % 3 === 0 ? `MAT-00${(i % materials.length) + 1} abaixo do minimo` : i % 3 === 1 ? `Tarefa de producao para ord-${String(i + 1).padStart(3, '0')} em atraso` : 'Comentario de auditoria',
  createdAt: iso(-i * 90),
  roleTarget: i % 3 === 0 ? 'Input Operator' : i % 3 === 1 ? 'Production Operator' : 'Manager',
  dedupeKey: `notif-${i}`,
}));

export function buildSeedData(): PilotDb {
  return {
    users,
    clients,
    uoms,
    uomConversions: [
      { id: 'conv-kg-g', fromUom: 'KG', toUom: 'EA', factor: 1000 },
      { id: 'conv-box-ea', fromUom: 'BOX', toUom: 'EA', factor: 12 },
    ],
    materials,
    stockBalances,
    stockReservations,
    orders,
    productionTasks,
    inventoryReceipts,
    notifications,
    mrpSuggestions: [],
    metricsDaily: [],
  };
}

export const defaultCurrentUserRole: Role = 'Seller';
