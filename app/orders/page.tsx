'use client';

import * as React from 'react';
import { ClipboardList, PackageSearch, PlusCircle, Star, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { readinessLabel } from '@/lib/domain/i18n';
import { getFirstApiErrorMessage } from '@/lib/api/errors';
import { useAuthUser } from '@/hooks/use-auth';
import { Material, Order, StockBalance, StockReservation, User } from '@/lib/domain/types';

type ConditionCategory = {
  id: number;
  name: string;
  values: Array<{ id: number; value: string }>;
};

type ConditionPickerTarget = {
  orderId: string;
  itemId: string;
};

const defaultConditionCategories = ['Fibra', 'FibraCor', 'Corda', 'CordaCor', 'Trico', 'TricoCor', 'Fio', 'Fiocor'];

const isMrpOrder = (order: Order) =>
  Boolean(order.isMrp ?? String(order.orderNumber ?? '').startsWith('MRP-'));

export default function OrdersPage() {
  const [db, setDb] = React.useState<{
    orders: Order[];
    materials: Material[];
    stockBalances: StockBalance[];
    stockReservations: StockReservation[];
    users: User[];
  }>({ orders: [], materials: [], stockBalances: [], stockReservations: [], users: [] });

  const { user: authUser } = useAuthUser();
  const currentUserId = authUser?.id ?? '';
  const { toast } = useToast();

  const refreshOrders = React.useCallback(async () => {
    const res = await fetch('/api/orders', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setDb((prev) => ({ ...prev, orders: Array.isArray(data) ? data : [] }));
  }, []);

  const refreshInventory = React.useCallback(async () => {
    const res = await fetch('/api/inventory', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setDb((prev) => ({
      ...prev,
      materials: Array.isArray(data.materials) ? data.materials : [],
      stockBalances: Array.isArray(data.stockBalances) ? data.stockBalances : [],
      stockReservations: Array.isArray(data.stockReservations) ? data.stockReservations : [],
    }));
  }, []);

  const refreshUsers = React.useCallback(async () => {
    const res = await fetch('/api/users', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setDb((prev) => ({ ...prev, users: Array.isArray(data.users) ? data.users : [] }));
  }, []);

  const createDraftOrder = React.useCallback(async () => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Falha ao criar pedido');
    }
    const order = await res.json();
    setDb((prev) => ({ ...prev, orders: [...prev.orders, order] }));
    return order.id as string;
  }, []);

  const deleteOrder = React.useCallback(async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const addItem = React.useCallback(async (orderId: string, materialId: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item', materialId }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const removeOrderItem = React.useCallback(async (orderId: string, itemId: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_item', itemId }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const updateOrderMeta = React.useCallback(async (orderId: string, payload: { clientId?: string; dueDate?: string; volumeCount?: number }) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_meta', ...payload }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const updateOrderClientName = React.useCallback((orderId: string, clientName: string) => {
    setDb((prev) => ({
      ...prev,
      orders: prev.orders.map((order) =>
        order.id === orderId ? { ...order, clientName } : order
      ),
    }));
  }, []);

  const persistOrderClientName = React.useCallback(async (orderId: string, clientName: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_client', clientName }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const updateOrderItemField = React.useCallback(
    (orderId: string, itemId: string, payload: {
      qtyRequested?: number;
      color?: string;
      shortageAction?: 'PRODUCE' | 'BUY';
      itemCondition?: string;
      conditionTemplateName?: string
    }) => {
      setDb((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            items: order.items.map((item) => {
              if (item.id !== itemId) return item;
              const next = { ...item, ...payload };
              const qtyRequested = payload.qtyRequested !== undefined ? payload.qtyRequested : item.qtyRequested;
              const shortageAction = payload.shortageAction ?? item.shortageAction ?? 'PRODUCE';
              const shortage = Math.max(0, (qtyRequested ?? 0) - (next.qtyReservedFromStock ?? 0));
              next.qtyToProduce = shortageAction === 'BUY' ? 0 : shortage;
              return next;
            }),
          };
        }),
      }));
    },
    []
  );

  const persistOrderItemField = React.useCallback(
    async (orderId: string, itemId: string, payload: {
      qtyRequested?: number;
      color?: string;
      shortageAction?: 'PRODUCE' | 'BUY';
      itemCondition?: string;
      conditionTemplateName?: string
    }) => {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_item', itemId, ...payload }),
      });
      await refreshOrders();
      await refreshInventory();
    },
    [refreshOrders, refreshInventory]
  );

  const addItemCondition = React.useCallback(async (orderId: string, itemId: string, payload?: { key?: string; value?: string }) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item_condition', itemId, key: payload?.key, value: payload?.value }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const updateItemConditionField = React.useCallback(async (orderId: string, itemId: string, index: number, payload: { key?: string; value?: string }) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_item_condition', itemId, index, ...payload }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const removeItemCondition = React.useCallback(async (orderId: string, itemId: string, index: number) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_item_condition', itemId, index }),
    });
    await refreshOrders();
  }, [refreshOrders]);

  const onQtyBlurReserve = React.useCallback(async (orderId: string, itemId: string, qtyRequested: number) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reserve', itemId, qtyRequested }),
    });
    await refreshOrders();
    await refreshInventory();
  }, [refreshOrders, refreshInventory]);

  const heartbeatOrder = React.useCallback(async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'heartbeat' }),
    });
    await refreshInventory();
  }, [refreshInventory]);

  const submitOrder = React.useCallback(async (order: Order) => {
    const errors: string[] = [];
    if (!order.clientName || order.clientName.trim().length === 0) {
      errors.push('Cliente obrigatório.');
    }
    if (!order.items || order.items.length === 0) {
      errors.push('Adicione ao menos um item.');
    }
    const invalidQty = (order.items || []).filter((item) => Number(item.qtyRequested) <= 0);
    if (invalidQty.length > 0) {
      errors.push('Quantidade precisa ser maior que zero.');
    }
    if (errors.length > 0) {
      toast({ title: 'Nao foi possivel enviar', description: errors.join(' '), variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_order' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Falha ao enviar pedido');
      }
      await refreshOrders();
      toast({ title: 'Pedido enviado', description: 'Status atualizado para ABERTO.' });
    } catch (err) {
      const message = getFirstApiErrorMessage(err) ?? 'Falha ao enviar pedido';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  }, [refreshOrders, toast]);

  const [mainView, setMainView] = React.useState<'open' | 'finalized'>('open');
  // default to show all orders ("Todos") instead of "Meus pedidos"
  const [subView, setSubView] = React.useState<'mine' | 'all'>('all');
  const [mrpView, setMrpView] = React.useState<'all' | 'mrp' | 'standard'>('all');
  const [mounted, setMounted] = React.useState(false);
  const [preconditionCategories, setPreconditionCategories] = React.useState<ConditionCategory[]>([]);
  const [conditionsLoading, setConditionsLoading] = React.useState(false);
  const [conditionPickerTarget, setConditionPickerTarget] = React.useState<ConditionPickerTarget | null>(null);
  const [conditionPickerSelection, setConditionPickerSelection] = React.useState<{
    categoryId: number | null;
    valueId: number | null;
  }>({ categoryId: null, valueId: null });
  const fallbackConditionCategories = React.useMemo(() => {
    const aggregated: Record<string, Set<string>> = {};
    defaultConditionCategories.forEach((key) => {
      aggregated[key] = new Set<string>();
    });

    db.materials.forEach((material: any) => {
      const metadata = material.metadata ?? {};
      defaultConditionCategories.forEach((key) => {
        const raw = metadata[key] ?? metadata[key.toLowerCase()];
        if (Array.isArray(raw)) {
          raw.forEach((value) => {
            if (value) aggregated[key].add(value);
          });
        } else if (typeof raw === 'string' && raw) {
          aggregated[key].add(raw);
        }
      });
    });

    let generatedId = 1;
    return defaultConditionCategories
      .map((key, index) => {
        const values = Array.from(aggregated[key] ?? []).map((value) => ({
          id: generatedId++,
          value,
        }));
        if (values.length === 0) return null;
        return { id: -(index + 1), name: key, values };
      })
      .filter(Boolean) as ConditionCategory[];
  }, [db.materials]);

  // Read URL search params only on the client after mount to avoid
  // Next.js prerender/runtime errors related to `useSearchParams()`.
  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get('view') as 'open' | 'finalized' | null;
      const sv = sp.get('sub') as 'mine' | 'all' | null;
      if (v) setMainView(v);
      if (sv) setSubView(sv);
    } catch {
      // ignore
    }
  }, []);

  // Load materials/orders/users from API on client mount
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.all([refreshInventory(), refreshOrders(), refreshUsers()]);
      } catch {
        // ignore
      }
      if (active) setMounted(true);
    })();
    return () => { active = false };
  }, [refreshInventory, refreshOrders, refreshUsers]);

  const fetchConditionCategories = React.useCallback(async () => {
    setConditionsLoading(true);
    try {
      const response = await fetch('/api/preconditions');
      if (!response.ok) throw new Error('Falha ao carregar pre-condicoes');
      const data = await response.json();
      if (Array.isArray(data)) setPreconditionCategories(data);
      else setPreconditionCategories([]);
    } catch (error) {
      console.error('Failed to load preconditions', error);
      setPreconditionCategories([]);
      toast({ title: 'Erro', description: 'Nao foi possivel carregar as pre-condicoes', variant: 'destructive' });
    } finally {
      setConditionsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchConditionCategories();
  }, [fetchConditionCategories]);

  React.useEffect(() => {
    if (!conditionsLoading && preconditionCategories.length === 0 && fallbackConditionCategories.length > 0) {
      setPreconditionCategories(fallbackConditionCategories);
    }
  }, [conditionsLoading, fallbackConditionCategories, preconditionCategories.length]);

  React.useEffect(() => {
    if (!conditionPickerTarget) return;
    const defaultCategory = preconditionCategories[0];
    setConditionPickerSelection({
      categoryId: defaultCategory?.id ?? null,
      valueId: defaultCategory?.values[0]?.id ?? null,
    });
  }, [conditionPickerTarget, preconditionCategories]);

  const handleSelectPrecondition = React.useCallback(
    (orderId: string, itemId: string, categoryName: string, value: string) => {
      addItemCondition(orderId, itemId, { key: categoryName, value });
      setConditionPickerTarget(null);
    },
    [addItemCondition]
  );

  const filteredOrders = React.useMemo(() => {
    return db.orders.filter((order) => {
      if (order.trashedAt) return false;
      const orderIsMrp = isMrpOrder(order);
      if (orderIsMrp && !order.hasPendingProduction) return false;
      if (mrpView === 'mrp' && !orderIsMrp) return false;
      if (mrpView === 'standard' && orderIsMrp) return false;

      const isFinalized = order.status === 'FINALIZADO' || order.status === 'SAIDA_CONCLUIDA';
      if (mainView === 'open' && isFinalized) return false;
      if (mainView === 'finalized' && !isFinalized) return false;
      if (subView === 'mine') return order.createdBy === currentUserId;
      return true;
    });
  }, [db.orders, mainView, subView, currentUserId, mrpView]);

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(filteredOrders[0]?.id ?? null);

  React.useEffect(() => {
    if (!filteredOrders.find((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders]);

  const selectedOrder = db.orders.find((item) => item.id === selectedOrderId) ?? null;
  const selectedOrderIsMrp = selectedOrder ? isMrpOrder(selectedOrder) : false;

  React.useEffect(() => {
    if (!selectedOrder) {
      if (conditionPickerTarget) setConditionPickerTarget(null);
      return;
    }
    if (conditionPickerTarget && conditionPickerTarget.orderId !== selectedOrder.id) {
      setConditionPickerTarget(null);
    }
  }, [selectedOrder?.id, conditionPickerTarget]);

  const stockByMaterial = React.useMemo(() => {
    const map = new Map<string, { onHand: number; reservedTotal: number; productionReserved: number; available: number }>();
    db.stockBalances.forEach((balance) => {
      const productionReserved = (balance as any).productionReserved ?? 0;
      map.set(balance.materialId, {
        onHand: balance.onHand,
        reservedTotal: balance.reservedTotal,
        productionReserved,
        available: Math.max(0, balance.onHand - (balance.reservedTotal ?? 0) - productionReserved),
      });
    });
    return map;
  }, [db.stockBalances]);

  const handleNewOrder = async () => {
    const id = await createDraftOrder();
    setSelectedOrderId(id);
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-col">
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
                <div className="ml-0">
                  <Select value={mainView} onValueChange={(v) => setMainView(v as 'open' | 'finalized')}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Pedidos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Pedidos</SelectItem>
                      <SelectItem value="finalized">Pedidos finalizados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-0">
                  <Select value={subView} onValueChange={(v) => setSubView(v as 'mine' | 'all')}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">Meus pedidos</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-0">
                  <Select value={mrpView} onValueChange={(value) => setMrpView(value as 'all' | 'mrp' | 'standard')}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="mrp">Somente MRP</SelectItem>
                      <SelectItem value="standard">Pedidos normais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription className="mt-2 truncate">Reserva em tempo real (TTL + heartbeat).</CardDescription>
            </div>
            <div className="ml-0 w-full shrink-0 sm:ml-2 sm:w-auto">
              <Button onClick={handleNewOrder} size="sm" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!mounted ? (
            // render same empty state on server and during first client render to avoid hydration mismatches
            <EmptyState icon={ClipboardList} title="Nenhum pedido na visualizacao" description="Ajuste os filtros ou crie um novo pedido para iniciar." className="min-h-[120px]" />
          ) : filteredOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhum pedido na visualizacao" description="Ajuste os filtros ou crie um novo pedido para iniciar." className="min-h-[120px]" />
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-2">
              {filteredOrders.map((order) => {
                const orderIsMrp = isMrpOrder(order);
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-xl border border-border/70 bg-muted/20 p-3 text-left transition hover:border-primary sm:p-4 ${
                      selectedOrderId === order.id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <p className="font-medium flex flex-wrap items-center gap-1">
                      {orderIsMrp && <Star className="h-4 w-4 text-amber-500" aria-label="Pedido MRP" />}
                      {order.orderNumber} — <span className="text-base text-muted-foreground">{db.users.find((u) => u.id === order.createdBy)?.name ?? order.createdBy}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{order.clientName} - {formatDate(order.orderDate)}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">{order.status}</Badge>
                      <Badge variant={order.readiness === 'READY_FULL' ? 'positive' : order.readiness === 'READY_PARTIAL' ? 'warning' : 'outline'}>
                        {readinessLabel(order.readiness)}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        {!mounted || !selectedOrder ? (
          <CardContent className="pt-6">
            <EmptyState
              icon={PackageSearch}
              title="Selecione um pedido"
              description="Selecione ou crie um pedido para editar itens e simular reservas."
              className="min-h-[220px]"
            />
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>
                    <span className="flex flex-wrap items-center gap-1">
                      {selectedOrderIsMrp && <Star className="h-4 w-4 text-amber-500" aria-label="Pedido MRP" />}
                      {selectedOrder.orderNumber} — <span className="text-base text-muted-foreground">{db.users.find((u) => u.id === selectedOrder.createdBy)?.name ?? selectedOrder.createdBy}</span>
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Status {selectedOrder.status} - Pronto {readinessLabel(selectedOrder.readiness)}
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button className="w-full sm:w-auto" variant="outline" onClick={async () => {
                    try {
                      await deleteOrder(selectedOrder.id);
                      setSelectedOrderId(null);
                    } catch (err) {
                      console.error(err);
                      alert('Erro ao remover pedido');
                    }
                  }}>
                    <Trash2 className="mr-2 h-4 w-4" />Excluir
                  </Button>
                  {/* Save button removed: unused/empty button caused an empty element in the DOM */}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => selectedOrder && submitOrder(selectedOrder)}
                  disabled={selectedOrder.status !== 'RASCUNHO'}
                  className="w-full font-semibold sm:w-auto sm:min-w-[160px]"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar pedido
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label>Cliente</Label>
                  <Input
                    value={selectedOrder.clientName}
                    onChange={(e) => updateOrderClientName(selectedOrder.id, e.target.value)}
                    onBlur={(e) => persistOrderClientName(selectedOrder.id, e.target.value)}
                    placeholder="Digite o nome do cliente"
                  />
                </div>
                <div>
                  <Label>Data de entrega</Label>
                  <Input
                    type="date"
                    value={selectedOrder.dueDate.slice(0, 10)}
                    onChange={(e) => updateOrderMeta(selectedOrder.id, { dueDate: `${e.target.value}T12:00:00.000Z` })}
                  />
                </div>
                <div>
                  <Label>Volumes</Label>
                  <Input
                    type="number"
                    min={1}
                    value={selectedOrder.volumeCount}
                    onChange={(e) => updateOrderMeta(selectedOrder.id, { volumeCount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select onValueChange={(value) => addItem(selectedOrder.id, value)}>
                  <SelectTrigger className="w-full sm:max-w-sm">
                    <SelectValue placeholder="Adicionar material" />
                  </SelectTrigger>
                  <SelectContent>
                    {db.materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.id} - {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => heartbeatOrder(selectedOrder.id)}>Estender reserva por +5 min</Button>
              </div>

              <div className="max-h-[360px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qtd. solicitada</TableHead>
                      <TableHead>Faltante</TableHead>
                      <TableHead className="text-right">Em estoque</TableHead>
                      <TableHead className="text-right">Reservado (outros pedidos)</TableHead>
                      <TableHead className="text-right">Disponivel para este pedido</TableHead>
                      <TableHead className="text-right">Qtd. reservada (estoque)</TableHead>
                      <TableHead className="text-right">Qtd. para produzir</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-20 text-center text-muted-foreground">
                          Adicione itens para iniciar a reserva.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedOrder.items.map((item) => {
                        const stock = stockByMaterial.get(item.materialId) ?? { onHand: 0, reservedTotal: 0, available: 0 };
                        const reservations = db.stockReservations.filter(
                          (reservation) => reservation.orderId === selectedOrder.id && reservation.materialId === item.materialId
                        );
                        const currentOrderReservedForMaterial = reservations.reduce((acc, reservation) => acc + reservation.qty, 0);
                        const reservedByOtherOrders = Math.max(0, stock.reservedTotal - currentOrderReservedForMaterial);
                        const availableForThisOrder = Math.max(0, stock.onHand - reservedByOtherOrders);
                        const isPickerOpen =
                          conditionPickerTarget?.orderId === selectedOrder.id && conditionPickerTarget?.itemId === item.id;

                        return (
                          <React.Fragment key={item.id}>
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">{item.materialName}</p>
                                <p className="text-xs text-muted-foreground">{item.materialId} - {item.uom}</p>
                              </TableCell>
                              {/* `Cor` column removed; prefer item.conditions for color */}
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={item.qtyRequested}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const qty = raw === '' ? 0 : Number(raw);
                                    updateOrderItemField(selectedOrder.id, item.id, {
                                      qtyRequested: Number.isFinite(qty) ? qty : 0,
                                    });
                                    if (raw !== '' && Number.isFinite(qty)) {
                                      onQtyBlurReserve(selectedOrder.id, item.id, qty);
                                    }
                                  }}
                                  onBlur={(e) => onQtyBlurReserve(selectedOrder.id, item.id, Number(e.target.value || 0))}
                                  className="ml-auto w-full max-w-[7rem] text-right"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.shortageAction ?? 'PRODUCE'}
                                  onValueChange={(value) => {
                                    const action = value as 'PRODUCE' | 'BUY';
                                    updateOrderItemField(selectedOrder.id, item.id, { shortageAction: action });
                                    persistOrderItemField(selectedOrder.id, item.id, { shortageAction: action });
                                  }}
                                >
                                  <SelectTrigger className="w-full min-w-[7rem]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PRODUCE">Produzir</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">{stock.onHand}</TableCell>
                              <TableCell className="text-right">{reservedByOtherOrders}</TableCell>
                              <TableCell className="text-right">{availableForThisOrder}</TableCell>
                              <TableCell className="text-right font-semibold text-primary">{item.qtyReservedFromStock}</TableCell>
                              <TableCell className="text-right font-semibold text-amber-600">
                                {item.qtyToProduce}
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Cor"
                                  value={item.color ?? ''}
                                  onChange={(e) => updateOrderItemField(selectedOrder.id, item.id, { color: e.target.value })}
                                  onBlur={(e) => persistOrderItemField(selectedOrder.id, item.id, { color: String(e.target.value ?? '') })}
                                  className="w-full max-w-[7rem]"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" onClick={() => removeOrderItem(selectedOrder.id, item.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={10} className="bg-muted/30">
                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Condicao especifica do item</Label>
                                    {item.conditions && item.conditions.length > 0 ? (
                                      item.conditions.map((cond, idx) => (
                                        <div key={idx} className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                          <Input
                                            placeholder="Campo (ex: Cor)"
                                            value={cond.key}
                                            onChange={(e) => updateItemConditionField(selectedOrder.id, item.id, idx, { key: e.target.value })}
                                          />
                                          <Input
                                            placeholder="Valor (ex: Vermelho)"
                                            value={cond.value}
                                            onChange={(e) => updateItemConditionField(selectedOrder.id, item.id, idx, { value: e.target.value })}
                                          />
                                          <Button variant="ghost" onClick={() => removeItemCondition(selectedOrder.id, item.id, idx)}>
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-muted-foreground">Sem condicoes adicionadas.</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                        onClick={() =>
                                          setConditionPickerTarget({ orderId: selectedOrder.id, itemId: item.id })
                                        }
                                      >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Adicionar condição
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={() => addItemCondition(selectedOrder.id, item.id)}
                                      >
                                        Condição livre
                                      </Button>
                                    </div>
                                    {isPickerOpen && (
                                      <div className="mt-2 rounded-xl border border-border/70 bg-background p-3 text-sm shadow-inner">
                                        <div className="mb-2 flex items-center justify-between">
                                          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                                            Pré-condições
                                          </p>
                                          <Button variant="ghost" size="icon" onClick={() => setConditionPickerTarget(null)}>
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                        {conditionsLoading ? (
                                          <p className="text-xs text-muted-foreground">Carregando categorias...</p>
                                        ) : preconditionCategories.length === 0 ? (
                                          <p className="text-xs text-muted-foreground">Sem pré-condições cadastradas.</p>
                                        ) : (
                                          <div className="space-y-3">
                                            <div className="grid gap-2">
                                              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                                Categoria
                                              </Label>
                                              <Select
                                                value={
                                                  conditionPickerSelection.categoryId !== null
                                                    ? String(conditionPickerSelection.categoryId)
                                                    : ''
                                                }
                                                onValueChange={(value) => {
                                                  const parsed = Number(value);
                                                  const nextCategory = preconditionCategories.find(
                                                    (category) => category.id === parsed
                                                  );
                                                  setConditionPickerSelection({
                                                    categoryId: Number.isNaN(parsed) ? null : parsed,
                                                    valueId: nextCategory?.values[0]?.id ?? null,
                                                  });
                                                }}
                                              >
                                                <SelectTrigger className="w-full">
                                                  <SelectValue placeholder="Selecionar categoria" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {preconditionCategories.map((category) => (
                                                    <SelectItem key={category.id} value={String(category.id)}>
                                                      {category.name}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="grid gap-2">
                                              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                                Valor
                                              </Label>
                                              <Select
                                                value={
                                                  conditionPickerSelection.valueId !== null
                                                    ? String(conditionPickerSelection.valueId)
                                                    : ''
                                                }
                                                onValueChange={(value) => {
                                                  const parsed = Number(value);
                                                  setConditionPickerSelection((prev) => ({
                                                    ...prev,
                                                    valueId: Number.isNaN(parsed) ? null : parsed,
                                                  }));
                                                }}
                                              >
                                                <SelectTrigger className="w-full">
                                                  <SelectValue placeholder="Selecionar valor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {preconditionCategories
                                                    .find((category) => category.id === conditionPickerSelection.categoryId)
                                                    ?.values.map((value) => (
                                                      <SelectItem key={value.id} value={String(value.id)}>
                                                        {value.value}
                                                      </SelectItem>
                                                    ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                const category = preconditionCategories.find(
                                                  (cat) => cat.id === conditionPickerSelection.categoryId
                                                );
                                                const value = category?.values.find(
                                                  (val) => val.id === conditionPickerSelection.valueId
                                                );
                                                if (!category || !value) return;
                                                handleSelectPrecondition(
                                                  selectedOrder.id,
                                                  item.id,
                                                  category.name,
                                                  value.value
                                                );
                                              }}
                                              disabled={
                                                !conditionPickerSelection.categoryId || !conditionPickerSelection.valueId
                                              }
                                            >
                                              Aplicar condição
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="rounded-xl border border-border/70 bg-background p-3 text-sm">
                                    <p className="mb-2 font-medium">Reservas ativas</p>
                                    {reservations.length === 0 ? (
                                      <p className="text-muted-foreground">Sem reserva ativa para este item.</p>
                                    ) : (
                                      reservations.map((reservation) => (
                                        <p key={reservation.id} className="text-xs">
                                          reservado por {reservation.userName} no pedido {selectedOrder.orderNumber} ({reservation.qty}) - expira em {formatDate(reservation.expiresAt)}
                                        </p>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
