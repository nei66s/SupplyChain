export type Role =
  | 'Admin'
  | 'Manager'
  | 'Seller'
  | 'Input Operator'
  | 'Production Operator'
  | 'Picker';


export type OrderStatus =
  | 'RASCUNHO'
  | 'ABERTO'
  | 'EM_PICKING'
  | 'SAIDA_CONCLUIDA'
  | 'FINALIZADO'
  | 'CANCELADO';

export type ReadinessFlag = 'READY_FULL' | 'READY_PARTIAL' | 'NOT_READY';

export type ProductionTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export type ReceiptStatus = 'DRAFT' | 'POSTED';

export type NotificationType =
  | 'ALOCACAO_DISPONIVEL'
  | 'ESTOQUE_MINIMO'
  | 'ESTOQUE_PONTO_PEDIDO'
  | 'RUPTURA'
  | 'PRODUCAO_PENDENTE'
  | 'SISTEMA'
  | 'PEDIDO_FLUXO';

export type LabelFormat = 'EXIT_10x15' | 'PRODUCTION_4x4';

export type Uom = {
  id: string;
  code: string;
  description: string;
};

export type UomConversion = {
  id: string;
  fromUom: string;
  toUom: string;
  factor: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
};

export type Client = {
  id: string;
  name: string;
  contact: string;
};

export type Material = {
  id: string;
  sku?: string;
  description?: string;
  name: string;
  standardUom: string;
  minStock: number;
  reorderPoint: number;
  setupTimeMinutes: number;
  productionTimePerUnitMinutes: number;
  colorOptions: string[];
  metadata?: Record<string, string>;
};

export type StockBalance = {
  materialId: string;
  onHand: number;
  reservedTotal: number;
  productionReserved?: number;
};

export type StockReservation = {
  id: string;
  materialId: string;
  orderId: string;
  userId: string;
  userName: string;
  qty: number;
  expiresAt: string;
  updatedAt: string;
  createdAt: string;
};

export type ConditionVariant = {
  materialId: string;
  conditions: { key: string; value: string }[];
  quantityRequested: number;
  reservedFromStock: number;
  qtyToProduce: number;
};

export type OrderItem = {
  id: string;
  materialId: string;
  materialName: string;
  uom: string;
  color: string;
  description?: string;
  shortageAction?: 'PRODUCE' | 'BUY';
  qtyRequested: number;
  qtyReservedFromStock: number;
  qtyToProduce: number;
  qtyToBuy?: number;
  qtySeparated: number;
  separatedWeight?: number;
  producedQty?: number;
  producedWeight?: number;
  itemCondition?: string;
  conditionTemplateName?: string;
  // Lista de condições específicas do item (ex: cor: vermelho, lote: 1234)
  conditions?: { key: string; value: string }[];
};

export type AuditEvent = {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  status: OrderStatus;
  readiness: ReadinessFlag;
  orderDate: string;
  dueDate: string;
  createdBy: string;
  pickerId?: string;
  volumeCount: number;
  hasPendingProduction?: boolean;
  isMrp?: boolean;
  trashedAt?: string | null;
  items: OrderItem[];
  auditTrail: AuditEvent[];
  labelPrintCount: number;
  total?: number;
};

export type ProductionTask = {
  id: string;
  orderId: string;
  orderNumber: string;
  materialId: string;
  materialName: string;
  qtyToProduce: number;
  status: ProductionTaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReceiptItem = {
  materialId: string;
  materialName: string;
  qty: number;
  uom: string;
};

export type InventoryReceipt = {
  id: string;
  type: 'PRODUCTION';
  status: ReceiptStatus;
  items: InventoryReceiptItem[];
  sourceRef: string;
  createdAt: string;
  postedAt?: string;
  postedBy?: string;
  autoAllocated?: boolean;
};

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  roleTarget?: Role;
  userTarget?: string;
  orderId?: string;
  materialId?: string;
  dedupeKey?: string;
};

export type MrpSuggestion = {
  id: string;
  materialId: string;
  suggestedReorderPoint: number;
  suggestedMinStock: number;
  suggestedQty: number;
  rationale: string;
  createdAt: string;
  appliedAt?: string;
  status: string;
  updatedBy?: string;
  updatedAt: string;
};

export type MetricDaily = {
  id: string;
  date: string;
  ordersCreated: number;
  receiptsPosted: number;
  picksCompleted: number;
};

export type InventoryAdjustment = {
  id: string;
  materialId: string;
  materialName?: string;
  qtyBefore: number;
  qtyAfter: number;
  adjustmentQty: number;
  reason: string;
  actor: string;
  createdAt: string;
};

export type PilotDb = {
  users: User[];
  clients: Client[];
  uoms: Uom[];
  uomConversions: UomConversion[];
  materials: Material[];
  stockBalances: StockBalance[];
  stockReservations: StockReservation[];
  orders: Order[];
  productionTasks: ProductionTask[];
  inventoryReceipts: InventoryReceipt[];
  notifications: Notification[];
  mrpSuggestions: MrpSuggestion[];
  metricsDaily: MetricDaily[];
};

export const RESERVATION_TTL_MS = 5 * 60 * 1000;
