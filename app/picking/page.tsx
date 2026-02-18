'use client';

import * as React from 'react';
import { FileText, PackageCheck } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateLabelPdf } from '@/lib/domain/labels';
import { readinessLabel, readinessTabLabel } from '@/lib/domain/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Order, StockBalance, User } from '@/lib/domain/types';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

export default function PickingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = React.useState<'READY_FULL' | 'READY_PARTIAL' | 'ALL'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes, inventoryRes] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
        fetch('/api/inventory', { cache: 'no-store' }),
      ]);
      if (ordersRes.ok) {
        const payload = await ordersRes.json();
        setOrders(Array.isArray(payload) ? payload : []);
      }
      if (usersRes.ok) {
        const payload = await usersRes.json();
        setUsers(Array.isArray(payload) ? payload : []);
      }
      if (inventoryRes.ok) {
        const payload = await inventoryRes.json();
        setStockBalances(Array.isArray(payload.stockBalances) ? payload.stockBalances : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const queue = orders
    .filter((order) => ['EM_PICKING', 'ABERTO', 'SAIDA_CONCLUIDA'].includes(order.status))
    .filter((order) => (filter === 'ALL' ? true : order.readiness === filter));

  const stockByMaterial = useMemo(() => {
    const map = new Map<string, StockBalance>();
    stockBalances.forEach((balance) => {
      map.set(balance.materialId, balance);
    });
    return map;
  }, [stockBalances]);

  const selected = queue.find((order) => order.id === selectedOrderId) ?? queue[0] ?? null;

  React.useEffect(() => {
    if (!selectedOrderId && queue[0]) {
      setSelectedOrderId(queue[0].id);
    }
  }, [queue, selectedOrderId]);

  const handlePrintLabels = async () => {
    if (!selected) return;
    const pickerName = users.find((item) => item.id === selected.pickerId)?.name;
    await generateLabelPdf(selected, pickerName);
    await fetch(`/api/orders/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register_label_print', format: 'EXIT_10x15' }),
    });
    await loadData();
  };

  const updateSeparatedQtyLocal = (orderId: string, itemId: string, qty: number) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id !== orderId
          ? order
          : {
              ...order,
              items: order.items.map((item) =>
                item.id !== itemId ? item : { ...item, qtySeparated: qty }
              ),
            }
      )
    );
  };

  const updateSeparatedWeightLocal = (orderId: string, itemId: string, weight: number) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id !== orderId
          ? order
          : {
              ...order,
              items: order.items.map((item) =>
                item.id !== itemId ? item : { ...item, separatedWeight: weight }
              ),
            }
      )
    );
  };

  const commitSeparatedQty = async (orderId: string, itemId: string, qty: number) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_separated_qty', itemId, qtySeparated: qty }),
    });
    await loadData();
  };

  const commitSeparatedWeight = async (orderId: string, itemId: string, weight: number) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_separated_weight', itemId, separatedWeight: weight }),
    });
    await loadData();
  };

  const concludePicking = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_picking' }),
    });
    await loadData();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Fila de picking</CardTitle>
          <CardDescription>Filtre por prontidao e conclua separacao com baixa de saida simulada.</CardDescription>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as 'READY_FULL' | 'READY_PARTIAL' | 'ALL')}>
            <TabsList>
              <TabsTrigger value="ALL">Todos</TabsTrigger>
              <TabsTrigger value="READY_FULL">{readinessTabLabel.READY_FULL}</TabsTrigger>
              <TabsTrigger value="READY_PARTIAL">{readinessTabLabel.READY_PARTIAL}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-2">
          {queue.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Fila sem pedidos" description="Nao ha pedidos prontos para picking no momento." className="min-h-[120px]" />
          ) : (
            queue.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`w-full rounded-xl border border-border/70 bg-muted/20 p-4 text-left transition hover:border-primary ${selectedOrderId === order.id ? 'border-primary bg-primary/5' : ''}`}
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
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        {selected ? (
          <>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="font-headline flex items-center gap-2"><PackageCheck className="h-5 w-5" /> {selected.orderNumber}</CardTitle>
                  <CardDescription>
                    {selected.clientName} - entrega em {formatDate(selected.dueDate)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {
                    (() => {
                      const hasProductionBlocking = selected.items.some((it) => it.qtyToProduce > 0);
                      return (
                        <>
                          <Button variant="outline" onClick={handlePrintLabels} disabled={hasProductionBlocking}><FileText className="mr-2 h-4 w-4" />Imprimir etiquetas</Button>
                          <Button onClick={() => concludePicking(selected.id)} disabled={hasProductionBlocking}>Concluir picking</Button>
                        </>
                      )
                    })()
                  }
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                    <TableHead className="text-right">Qtd. solicitada</TableHead>
                    <TableHead className="text-right">Qtd. reservada</TableHead>
                    <TableHead className="text-right">Estoque atual</TableHead>
                    <TableHead className="text-right">Qtd. separada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.items.map((item) => {
                    const currentStock = stockByMaterial.get(item.materialId);
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow>
                          <TableCell>
                            <p className="font-medium">{item.materialName}</p>
                            <p className="text-xs text-muted-foreground">{item.uom} - {item.color}</p>
                            {item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0 ? (
                              <div className="mt-1">
                                <Badge variant="outline">Em produção</Badge>
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              className="ml-auto w-28 text-right"
                              value={item.separatedWeight ?? ''}
                              onChange={(e) => updateSeparatedWeightLocal(selected.id, item.id, Number(e.target.value))}
                              onBlur={(e) => commitSeparatedWeight(selected.id, item.id, Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell className="text-right">{item.qtyRequested}</TableCell>
                          <TableCell className="text-right">{item.qtyReservedFromStock}</TableCell>
                          <TableCell className="text-right">{currentStock?.onHand ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={item.qtyReservedFromStock}
                              className="ml-auto w-28 text-right"
                              value={item.qtySeparated}
                              onChange={(e) => updateSeparatedQtyLocal(selected.id, item.id, Number(e.target.value))}
                              onBlur={(e) => commitSeparatedQty(selected.id, item.id, Number(e.target.value))}
                              readOnly={item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0}
                              disabled={item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0}
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="space-y-2">
                              <Label>Condições do item</Label>
                              {item.conditions && item.conditions.length > 0 ? (
                                item.conditions.map((cond, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Input
                                      placeholder="Campo (ex: Cor)"
                                      value={cond.key}
                                      readOnly
                                    />
                                    <Input
                                      placeholder="Valor (ex: Vermelho)"
                                      value={cond.value}
                                      readOnly
                                    />
                                  </div>
                                ))
                              ) : (
                                <p className="text-muted-foreground">Sem condições adicionadas.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <Label className="text-sm">Ultimos eventos de auditoria</Label>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {selected.auditTrail.slice(0, 5).map((entry) => (
                    <p key={entry.id}>{formatDate(entry.timestamp)} - {entry.action} - {entry.actor}</p>
                  ))}
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="pt-6">
            <EmptyState icon={FileText} title="Selecione um pedido" description="Selecione um item da fila para iniciar a separacao." className="min-h-[220px]" />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
