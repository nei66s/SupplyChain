'use client';

import * as React from 'react';
import { Trash2, RotateCcw, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import { readinessLabel } from '@/lib/domain/i18n';
import { Order, StockBalance, StockReservation, User } from '@/lib/domain/types';

export default function OrdersTrashPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [stockBalances, setStockBalances] = React.useState<StockBalance[]>([]);
  const [stockReservations, setStockReservations] = React.useState<StockReservation[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);

  const loadData = React.useCallback(async () => {
    const [ordersRes, inventoryRes, usersRes] = await Promise.all([
      fetch('/api/orders', { cache: 'no-store' }),
      fetch('/api/inventory', { cache: 'no-store' }),
      fetch('/api/users', { cache: 'no-store' }),
    ]);
    if (ordersRes.ok) {
      const data = await ordersRes.json();
      setOrders(Array.isArray(data) ? data : []);
    }
    if (inventoryRes.ok) {
      const data = await inventoryRes.json();
      setStockBalances(Array.isArray(data.stockBalances) ? data.stockBalances : []);
      setStockReservations(Array.isArray(data.stockReservations) ? data.stockReservations : []);
    }
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const trashedOrders = React.useMemo(() => orders.filter((o) => o.trashedAt), [orders]);

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(trashedOrders[0]?.id ?? null);

  React.useEffect(() => {
    if (!trashedOrders.find((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(trashedOrders[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashedOrders]);

  const selectedOrder = orders.find((item) => item.id === selectedOrderId) ?? null;

  const stockByMaterial = React.useMemo(() => {
    const map = new Map<string, { onHand: number; reservedTotal: number; productionReserved: number; available: number }>();
    stockBalances.forEach((balance) => {
      const productionReserved = (balance as any).productionReserved ?? 0;
      map.set(balance.materialId, {
        onHand: balance.onHand,
        reservedTotal: balance.reservedTotal,
        productionReserved,
        available: Math.max(0, balance.onHand - balance.reservedTotal - productionReserved),
      });
    });
    return map;
  }, [stockBalances]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-3">
                <div className="text-lg font-medium">Lixeira de pedidos</div>
              </div>
              <CardDescription className="mt-2">Pedidos removidos recentemente. Visualize e restaure se necessário.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {trashedOrders.length === 0 ? (
            <EmptyState icon={PackageSearch} title="Lixeira vazia" description="Nenhum pedido removido recentemente." className="min-h-[120px]" />
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-2">
              {trashedOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full rounded-xl border border-border/70 bg-muted/20 p-3 text-left transition hover:border-primary sm:p-4 ${
                    selectedOrderId === order.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <p className="font-medium">
                    {order.orderNumber} — <span className="text-base text-muted-foreground">{users.find((u) => u.id === order.createdBy)?.name ?? order.createdBy}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{order.clientName} - Removido em {formatDate(order.trashedAt!)}</p>
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
                  <CardTitle>
                    {selectedOrder.orderNumber} — <span className="text-base text-muted-foreground">{users.find((u) => u.id === selectedOrder.createdBy)?.name ?? selectedOrder.createdBy}</span>
                  </CardTitle>
                  <CardDescription>
                    Status {selectedOrder.status} - Pronto {readinessLabel(selectedOrder.readiness)}
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button className="w-full sm:w-auto" variant="outline" onClick={async () => {
                    try {
                      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'restore' }),
                      });
                      if (!res.ok) {
                        const e = await res.json().catch(() => ({}));
                        alert(e?.error || 'Falha ao restaurar pedido');
                        return;
                      }
                      await loadData();
                      setSelectedOrderId(null);
                    } catch (err) {
                      console.error(err);
                      alert('Erro ao restaurar pedido');
                    }
                  }}>
                    <RotateCcw className="mr-2 h-4 w-4" />Restaurar
                  </Button>
                  <Button className="w-full sm:w-auto" size="sm" variant="destructive" onClick={async () => {
                    try {
                      const res = await fetch(`/api/orders/${selectedOrder.id}`, { method: 'DELETE' });
                      if (!res.ok) {
                        const e = await res.json().catch(() => ({}));
                        alert(e?.error || 'Falha ao excluir pedido');
                        return;
                      }
                      await loadData();
                      setSelectedOrderId(null);
                    } catch (err) {
                      console.error(err);
                      alert('Erro ao excluir pedido');
                    }
                  }}>
                    <Trash2 className="mr-2 h-4 w-4" />Excluir permanentemente
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label>Cliente</Label>
                  <Input value={selectedOrder.clientName} disabled />
                </div>
                <div>
                  <Label>Data de entrega</Label>
                  <Input type="date" value={selectedOrder.dueDate.slice(0, 10)} disabled />
                </div>
                <div>
                  <Label>Volumes</Label>
                  <Input type="number" value={selectedOrder.volumeCount} disabled />
                </div>
              </div>

              <div className="max-h-[360px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
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
                        <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                          Pedido sem itens.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedOrder.items.map((item) => {
                        const stock = stockByMaterial.get(item.materialId) ?? { onHand: 0, reservedTotal: 0, available: 0 };
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium">{item.materialName}</p>
                              <p className="text-xs text-muted-foreground">{item.materialId} - {item.uom}</p>
                            </TableCell>
                            {/* Color column removed; colors are available via item.conditions now */}
                            <TableCell className="text-right">{item.qtyRequested}</TableCell>
                            <TableCell className="text-right">{stock.onHand}</TableCell>
                            <TableCell className="text-right">{stock.reservedTotal}</TableCell>
                            <TableCell className="text-right">{stock.available}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">{item.qtyReservedFromStock}</TableCell>
                            <TableCell className="text-right font-semibold text-amber-600">{item.qtyToProduce}</TableCell>
                          </TableRow>
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
              description="Selecione um pedido removido para visualizar detalhes ou restaurar."
              className="min-h-[220px]"
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
