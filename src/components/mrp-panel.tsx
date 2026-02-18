import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Material, StockBalance, Order } from '@/lib/domain/types';
import { formatDate } from '@/lib/utils';

type InventoryReceipt = { postedAt?: string; items?: { materialId?: string; qty?: number }[] };
type ProductionTask = {
  id?: string;
  materialId?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  updatedAt?: string;
  createdAt?: string;
  qtyToProduce?: number;
};
type OrderItem = { materialId?: string; qtyRequested?: number };
type OrderType = { status?: string; orderDate?: string; createdAt?: string; items?: OrderItem[] };
type Db = { inventoryReceipts?: InventoryReceipt[]; productionTasks?: ProductionTask[]; orders?: OrderType[] };
type StockViewItem = StockBalance & { material?: Material; available: number };
type Suggestion = StockViewItem & { suggestionQty: number };

const WEEK_COUNT = 6;

function weekStartKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date);
  const offset = (shifted.getDay() + 6) % 7;
  shifted.setDate(shifted.getDate() - offset);
  shifted.setHours(0, 0, 0, 0);
  return shifted.toISOString().slice(0, 10);
}

function buildSeries(db: Db, materialId: string) {
  const today = new Date();
  const startOfWeek = new Date(today);
  const initialOffset = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - initialOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const buckets: Record<string, { label: string; entries: number; production: number; outputs: number }> = {};
  for (let i = WEEK_COUNT - 1; i >= 0; i--) {
    const start = new Date(startOfWeek);
    start.setDate(start.getDate() - i * 7);
    const key = start.toISOString().slice(0, 10);
    buckets[key] = {
      label: `Semana de ${formatDate(start)}`,
      entries: 0,
      production: 0,
      outputs: 0,
    };
  }

  const getBucket = (value?: string) => {
    if (!value) return null;
    const key = weekStartKey(value);
    if (!key) return null;
    return buckets[key];
  };

  (db.inventoryReceipts || []).forEach((receipt) => {
    const bucket = getBucket(receipt.postedAt);
    if (!bucket) return;
    (receipt.items || []).forEach((item) => {
      if (item.materialId === materialId) bucket.entries += item.qty || 0;
    });
  });

  (db.productionTasks || []).forEach((task) => {
    if (task.materialId !== materialId) return;
    if (task.status !== 'DONE') return;
    const ts = task.updatedAt ?? task.createdAt;
    const bucket = getBucket(ts);
    if (!bucket) return;
    bucket.production += task.qtyToProduce || 0;
  });

  (db.orders || []).forEach((order) => {
    if (!['SAIDA_CONCLUIDA', 'FINALIZADO'].includes(order.status || '')) return;
    const ts = order.orderDate ?? order.createdAt;
    const bucket = getBucket(ts);
    if (!bucket) return;
    (order.items || []).forEach((item) => {
      if (item.materialId === materialId) bucket.outputs += item.qtyRequested || 0;
    });
  });

  return Object.values(buckets);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

export default function MrpPanel() {
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [stockBalances, setStockBalances] = React.useState<StockBalance[]>([]);
  const [inventoryReceipts, setInventoryReceipts] = React.useState<InventoryReceipt[]>([]);
  const [productionTasks, setProductionTasks] = React.useState<ProductionTask[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [expandedMaterialId, setExpandedMaterialId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMaterial, setDialogMaterial] = React.useState<Suggestion | null>(null);
  const [dialogQty, setDialogQty] = React.useState('');
  const [dialogOrderId, setDialogOrderId] = React.useState('');
  const [dialogOrderNumber, setDialogOrderNumber] = React.useState<string | null>(null);
  const [dialogBusy, setDialogBusy] = React.useState(false);
  const [creatingOrderDraft, setCreatingOrderDraft] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [inventoryRes, receiptsRes, tasksRes, ordersRes] = await Promise.all([
          fetch('/api/inventory', { cache: 'no-store' }),
          fetch('/api/receipts', { cache: 'no-store' }),
          fetch('/api/production', { cache: 'no-store' }),
          fetch('/api/orders', { cache: 'no-store' }),
        ]);
        if (inventoryRes.ok) {
          const data = await inventoryRes.json();
          setMaterials(Array.isArray(data.materials) ? data.materials : []);
          setStockBalances(Array.isArray(data.stockBalances) ? data.stockBalances : []);
        }
        if (receiptsRes.ok) {
          const data = await receiptsRes.json();
          setInventoryReceipts(Array.isArray(data) ? data : []);
        }
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setProductionTasks(Array.isArray(data) ? data : []);
        }
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Planejamento de Materiais: falha ao carregar', err);
      }
    })();
  }, []);

  const stockView = React.useMemo<StockViewItem[]>(() => {
    const materialsById = Object.fromEntries(materials.map((m) => [m.id, m]));
    return stockBalances.map((balance) => {
      const material = materialsById[balance.materialId];
      const productionReserved = (balance as any).productionReserved ?? 0;
      const available = Math.max(0, balance.onHand - (balance.reservedTotal ?? 0) - productionReserved);
      return { ...balance, material, available };
    });
  }, [materials, stockBalances]);

  const suggestions = React.useMemo<Suggestion[]>(() => {
    return stockView
      .map((entry) => {
        const material = entry.material;
        const reorderPoint = material?.reorderPoint ?? 0;
        const suggestionQty = Math.max(reorderPoint - entry.available, 0);
        return { ...entry, material, suggestionQty };
      })
      .filter((entry) => entry.material && entry.suggestionQty > 0);
  }, [stockView]);

  const tasksByMaterial = React.useMemo(() => {
    const map = new Map<string, ProductionTask[]>();
    productionTasks.forEach((task) => {
      if (!task.materialId) return;
      const list = map.get(task.materialId) ?? [];
      list.push(task);
      map.set(task.materialId, list);
    });
    return map;
  }, [productionTasks]);

  const getSuggestionStatus = (materialId?: string) => {
    const fallback = { label: 'Necessita produção', variant: 'destructive' as const };
    if (!materialId) return fallback;
    const tasks = tasksByMaterial.get(materialId);
    if (!tasks || tasks.length === 0) return fallback;
    const inProgress = tasks.find((task) => task.status === 'IN_PROGRESS');
    if (inProgress) return { label: 'Em produção', variant: 'info' as const };
    const pending = tasks.find((task) => task.status === 'PENDING');
    if (pending) return { label: 'Produção agendada', variant: 'warning' as const };
    const done = tasks.find((task) => task.status === 'DONE');
    if (done) return { label: 'Produzido recentemente', variant: 'positive' as const };
    return fallback;
  };

  const toggleExpand = (materialId: string) => {
    setExpandedMaterialId((cur) => (cur === materialId ? null : materialId));
  };

  const handleOpenDialog = async (suggestion: Suggestion) => {
    setDialogMaterial(suggestion);
    setDialogQty(String(Math.max(1, Math.ceil(suggestion.suggestionQty))));
    setDialogError(null);
    setDialogOrderId('');
    setDialogOrderNumber(null);
    setDialogOpen(true);
    try {
      const order = await createDraftOrder();
      setDialogOrderId(order.id);
      setDialogOrderNumber(order.orderNumber ?? null);
    } catch (err) {
      // show error in dialog but keep dialog open so user can retry
      setDialogError(errorMessage(err));
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogMaterial(null);
    setDialogQty('');
    setDialogOrderId('');
    setDialogOrderNumber(null);
    setDialogError(null);
    setDialogBusy(false);
  };

  async function createDraftOrder() {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rascunho', source: 'mrp' }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? 'Falha ao criar pedido');
    }
    const order = (await response.json()) as Order;
    setOrders((prev) => [...prev, order]);
    return order;
  }

  const handleDraftOrder = async () => {
    setDialogError(null);
    setCreatingOrderDraft(true);
    try {
      const order = await createDraftOrder();
      setDialogOrderId(order.id);
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setCreatingOrderDraft(false);
    }
  };

  const handleCreateProduction = async () => {
    if (!dialogMaterial) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      let targetOrderId = dialogOrderId;
      if (!targetOrderId) {
        const order = await createDraftOrder();
        targetOrderId = order.id;
        setDialogOrderId(order.id);
      }
      const parsedQty = Number(dialogQty);
      const fallbackQty = Math.max(1, Math.ceil(dialogMaterial.suggestionQty));
      const quantity =
        Number.isFinite(parsedQty) && parsedQty > 0 ? Math.floor(parsedQty) : fallbackQty;
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: targetOrderId,
          materialId: dialogMaterial.materialId,
          qtyToProduce: quantity,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Falha ao criar ordem de produção');
      }
      const created = await res.json();
      setProductionTasks((prev) => {
        const exists = prev.find((task) => task.id && task.id === created.id);
        if (exists) {
          return prev.map((task) => (task.id === created.id ? created : task));
        }
        return [...prev, created];
      });
      closeDialog();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setDialogBusy(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) closeDialog();
    else setDialogOpen(true);
  };

  const db: Db = {
    inventoryReceipts,
    productionTasks,
    orders: orders.map((order) => ({
      status: order.status,
      orderDate: order.orderDate,
      createdAt: order.orderDate,
      items: (order.items ?? []).map((item) => ({
        materialId: item.materialId,
        qtyRequested: item.qtyRequested,
      })),
    })),
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sugestões de Planejamento de Materiais</CardTitle>
          <CardDescription>Itens abaixo do ponto de pedido / necessidades calculadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                <TableHead className="text-right">Ponto pedido</TableHead>
                <TableHead className="text-right">Sugestão</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="border-none py-8 text-center text-sm text-muted-foreground">
                    Nenhuma sugestão no momento.
                  </TableCell>
                </TableRow>
              ) : (
                suggestions.map((s) => {
                  const status = getSuggestionStatus(s.materialId);
                  return (
                    <React.Fragment key={s.materialId}>
                      <TableRow>
                        <TableCell>{s.material?.name ?? s.materialId}</TableCell>
                        <TableCell className="text-right">{s.available}</TableCell>
                        <TableCell className="text-right">{s.material?.reorderPoint ?? 0}</TableCell>
                        <TableCell className="text-right">{s.suggestionQty}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpand(s.materialId)}
                              aria-label={expandedMaterialId === s.materialId ? 'Fechar histórico' : 'Ver histórico'}
                            >
                              {expandedMaterialId === s.materialId ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={dialogBusy}
                              onClick={() => handleOpenDialog(s)}
                            >
                              Criar ordem de produção
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedMaterialId === s.materialId && (
                        <TableRow>
                          <TableCell colSpan={6} className="border-none p-4">
                            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                              <div className="font-medium mb-2">{s.material?.name ?? s.materialId}</div>
                              <div className="h-56">
                                <ResponsiveContainer width="100%" height={220}>
                                  <LineChart data={buildSeries(db, s.materialId)}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                      type="monotone"
                                      dataKey="entries"
                                      name="Entradas"
                                      stroke="#2563eb"
                                      dot={false}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="production"
                                      name="Produção"
                                      stroke="#f59e0b"
                                      dot={false}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="outputs"
                                      name="Saídas"
                                      stroke="#10b981"
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar ordem de produção</DialogTitle>
            <DialogDescription>
              Gere uma tarefa para o material {dialogMaterial?.material?.name ?? dialogMaterial?.materialId}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="production-qty">
                Quantidade (mínimo 1) — sugestão atual {dialogMaterial ? dialogMaterial.suggestionQty : 0}
              </Label>
              <Input
                id="production-qty"
                type="number"
                min={1}
                value={dialogQty}
                onChange={(event) => setDialogQty(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="production-order">Pedido associado</Label>
              <Input
                id="production-order"
                readOnly
                value={dialogOrderNumber ?? dialogOrderId ?? 'Gerando pedido...'}
              />
            </div>
            {dialogError ? <p className="text-sm text-destructive">{dialogError}</p> : null}
          </div>
          <DialogFooter className="justify-end gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={dialogBusy || creatingOrderDraft}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProduction} disabled={dialogBusy}>
              {dialogBusy ? 'Criando...' : 'Criar ordem de produção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
