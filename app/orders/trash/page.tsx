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
import { usePilotStore } from '@/lib/pilot/store';
import { formatDate } from '@/lib/utils';
import { readinessLabel } from '@/lib/pilot/i18n';

export default function OrdersTrashPage() {
  const db = usePilotStore((s) => s.db);
  const restoreOrder = usePilotStore((s) => s.restoreOrder);
  const purgeOrder = usePilotStore((s) => s.purgeOrder);

  const trashedOrders = React.useMemo(() => db.orders.filter((o) => o.trashedAt), [db.orders]);

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(trashedOrders[0]?.id ?? null);

  React.useEffect(() => {
    if (!trashedOrders.find((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(trashedOrders[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashedOrders]);

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

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
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
                  className={`w-full rounded-xl border border-border/70 bg-muted/20 p-4 text-left transition hover:border-primary ${
                    selectedOrderId === order.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <p className="font-medium">
                    {order.orderNumber} — <span className="text-base text-muted-foreground">{db.users.find((u) => u.id === order.createdBy)?.name ?? order.createdBy}</span>
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
                    {selectedOrder.orderNumber} — <span className="text-base text-muted-foreground">{db.users.find((u) => u.id === selectedOrder.createdBy)?.name ?? selectedOrder.createdBy}</span>
                  </CardTitle>
                  <CardDescription>
                    Status {selectedOrder.status} - Pronto {readinessLabel(selectedOrder.readiness)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { restoreOrder(selectedOrder.id); setSelectedOrderId(null); }}>
                    <RotateCcw className="mr-2 h-4 w-4" />Restaurar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { purgeOrder(selectedOrder.id); setSelectedOrderId(null); }}>
                    <Trash2 className="mr-2 h-4 w-4" />Excluir permanentemente
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
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
                            <TableCell>
                              <Input value={item.color} disabled />
                            </TableCell>
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
