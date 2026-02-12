'use client';

import * as React from 'react';
import { ClipboardList, PackageSearch, PlusCircle, Save, Trash2 } from 'lucide-react';
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
import { usePilotStore } from '@/lib/pilot/store';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { readinessLabel } from '@/lib/pilot/i18n';

export default function OrdersPage() {
  const db = usePilotStore((state) => state.db);
  const createDraftOrder = usePilotStore((state) => state.createDraftOrder);
  const deleteOrder = usePilotStore((state) => state.deleteOrder);
  const addItem = usePilotStore((state) => state.addItem);
  const updateOrderMeta = usePilotStore((state) => state.updateOrderMeta);
  const updateOrderItemField = usePilotStore((state) => state.updateOrderItemField);
  const updateOrderClientName = usePilotStore((state) => state.updateOrderClientName);
  const addItemCondition = usePilotStore((state) => state.addItemCondition);
  const updateItemConditionField = usePilotStore((state) => state.updateItemConditionField);
  const removeItemCondition = usePilotStore((state) => state.removeItemCondition);
  const onQtyBlurReserve = usePilotStore((state) => state.onQtyBlurReserve);
  const saveOrder = usePilotStore((state) => state.saveOrder);
  const heartbeatOrder = usePilotStore((state) => state.heartbeatOrder);

  const currentUserId = usePilotStore((state) => state.currentUserId);

  const [mainView, setMainView] = React.useState<'open' | 'finalized'>('open');
  const [subView, setSubView] = React.useState<'mine' | 'all'>('mine');

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

  const filteredOrders = React.useMemo(() => {
    return db.orders.filter((order) => {
      const isFinalized = order.status === 'FINALIZADO';
      if (mainView === 'open' && isFinalized) return false;
      if (mainView === 'finalized' && !isFinalized) return false;
      if (subView === 'mine') return order.createdBy === currentUserId;
      return true;
    });
  }, [db.orders, mainView, subView, currentUserId]);

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(filteredOrders[0]?.id ?? null);

  React.useEffect(() => {
    if (!filteredOrders.find((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders]);

  const selectedOrder = db.orders.find((item) => item.id === selectedOrderId) ?? null;

  const stockByMaterial = React.useMemo(() => {
    const map = new Map<string, { onHand: number; reservedTotal: number; available: number }>();
    db.stockBalances.forEach((balance) => {
      map.set(balance.materialId, {
        onHand: balance.onHand,
        reservedTotal: balance.reservedTotal,
        available: Math.max(0, balance.onHand - balance.reservedTotal),
      });
    });
    return map;
  }, [db.stockBalances]);

  const handleNewOrder = () => {
    const id = createDraftOrder();
    setSelectedOrderId(id);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant={mainView === 'open' ? undefined : 'ghost'} size="sm" onClick={() => setMainView('open')}>Pedidos</Button>
                <Button variant={mainView === 'finalized' ? undefined : 'ghost'} size="sm" onClick={() => setMainView('finalized')}>Pedidos finalizados</Button>
                <div className="ml-0">
                  <Select value={subView} onValueChange={(v) => setSubView(v as 'mine' | 'all')}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">Meus pedidos</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription className="mt-2 truncate">Reserva em tempo real (TTL + heartbeat) simulada no frontend.</CardDescription>
            </div>
            <div className="ml-2 shrink-0">
              <Button onClick={handleNewOrder} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhum pedido na visualizacao" description="Ajuste os filtros ou crie um novo pedido para iniciar." className="min-h-[120px]" />
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-2">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full rounded-xl border border-border/70 bg-muted/20 p-4 text-left transition hover:border-primary ${
                    selectedOrderId === order.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{order.clientName} - {formatDate(order.orderDate)}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline">{order.status}</Badge>
                    <Badge variant={order.readiness === 'READY_FULL' ? 'positive' : order.readiness === 'READY_PARTIAL' ? 'warning' : 'outline'}>
                      {readinessLabel(order.readiness)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        {selectedOrder ? (
          <>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{selectedOrder.orderNumber}</CardTitle>
                  <CardDescription>
                    Status {selectedOrder.status} - Pronto {readinessLabel(selectedOrder.readiness)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { deleteOrder(selectedOrder.id); setSelectedOrderId(null); }}>
                    <Trash2 className="mr-2 h-4 w-4" />Excluir
                  </Button>
                  <Button onClick={() => saveOrder(selectedOrder.id)}>
                    <Save className="mr-2 h-4 w-4" />Salvar e recalcular
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Cliente</Label>
                  <Input
                    value={selectedOrder.clientName}
                    onChange={(e) => updateOrderClientName(selectedOrder.id, e.target.value)}
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

              <div className="flex items-center gap-2">
                <Select onValueChange={(value) => addItem(selectedOrder.id, value)}>
                  <SelectTrigger className="max-w-sm">
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
                <Button variant="outline" onClick={() => heartbeatOrder(selectedOrder.id)}>Estender reserva por +5 min</Button>
              </div>

              <div className="max-h-[360px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead className="text-right">Qtd. solicitada</TableHead>
                      <TableHead className="text-right">Em estoque</TableHead>
                      <TableHead className="text-right">Reservado</TableHead>
                      <TableHead className="text-right">Disponivel</TableHead>
                      <TableHead className="text-right">Qtd. reservada (estoque)</TableHead>
                      <TableHead className="text-right">Qtd. para produzir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                          Adicione itens para iniciar a reserva.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedOrder.items.map((item) => {
                        const stock = stockByMaterial.get(item.materialId) ?? { onHand: 0, reservedTotal: 0, available: 0 };
                        const reservations = db.stockReservations.filter(
                          (reservation) => reservation.orderId === selectedOrder.id && reservation.materialId === item.materialId
                        );

                        return (
                          <React.Fragment key={item.id}>
                            <TableRow>
                              <TableCell>
                                <p className="font-medium">{item.materialName}</p>
                                <p className="text-xs text-muted-foreground">{item.materialId} - {item.uom}</p>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.color}
                                  onChange={(e) => updateOrderItemField(selectedOrder.id, item.id, { color: e.target.value })}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={item.qtyRequested}
                                  onChange={(e) =>
                                    updateOrderItemField(selectedOrder.id, item.id, {
                                      qtyRequested: Number(e.target.value),
                                    })
                                  }
                                  onBlur={(e) => onQtyBlurReserve(selectedOrder.id, item.id, Number(e.target.value))}
                                  className="ml-auto w-24 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">{stock.onHand}</TableCell>
                              <TableCell className="text-right">{stock.reservedTotal}</TableCell>
                              <TableCell className="text-right">{stock.available}</TableCell>
                              <TableCell className="text-right font-semibold text-primary">{item.qtyReservedFromStock}</TableCell>
                              <TableCell className="text-right font-semibold text-amber-600">{item.qtyToProduce}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={8} className="bg-muted/30">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Condicao especifica do item</Label>
                                    {item.conditions && item.conditions.length > 0 ? (
                                      item.conditions.map((cond, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
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
                                    <div className="flex gap-2">
                                      <Button type="button" variant="outline" onClick={() => addItemCondition(selectedOrder.id, item.id)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />Adicionar condicao
                                      </Button>
                                    </div>
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
        ) : (
          <CardContent className="pt-6">
            <EmptyState
              icon={PackageSearch}
              title="Selecione um pedido"
              description="Selecione ou crie um pedido para editar itens e simular reservas."
              className="min-h-[220px]"
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
