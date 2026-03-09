'use client';

import * as React from 'react';
import { FileText, PackageCheck, RefreshCw } from 'lucide-react';
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
import { notifyDataRefreshed } from '@/lib/data-refresh';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Order, StockBalance, User } from '@/lib/domain/types';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type LoadPickingOptions = {
  skipLoading?: boolean;
};

export default function PickingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const dataFingerprintRef = useRef('');

  const [filter, setFilter] = React.useState<'READY_FULL' | 'READY_PARTIAL' | 'ALL'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  const loadData = useCallback(async (opts?: LoadPickingOptions) => {
    const skipLoading = opts?.skipLoading;
    if (!skipLoading) {
      setLoading(true);
    }
    let refreshed = false;
    try {
      const [ordersRes, usersRes, inventoryRes] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
        fetch('/api/inventory', { cache: 'no-store' }),
      ]);
      if (!ordersRes.ok || !usersRes.ok || !inventoryRes.ok) {
        return;
      }

      const [ordersPayload, usersPayload, inventoryPayload] = await Promise.all([
        ordersRes.json(),
        usersRes.json(),
        inventoryRes.json(),
      ]);

      const nextOrders = Array.isArray(ordersPayload) ? ordersPayload : [];
      const nextUsers = Array.isArray(usersPayload) ? usersPayload : [];
      const nextStockBalances = Array.isArray(inventoryPayload.stockBalances)
        ? inventoryPayload.stockBalances
        : [];

      const nextFingerprint = JSON.stringify({
        orders: nextOrders,
        users: nextUsers,
        stockBalances: nextStockBalances,
      });

      const isTyping = document.activeElement?.tagName === 'INPUT';

      if (nextFingerprint !== dataFingerprintRef.current && !isTyping) {
        dataFingerprintRef.current = nextFingerprint;
        setOrders(nextOrders);
        setUsers(nextUsers);
        setStockBalances(nextStockBalances);
        refreshed = true;
      }
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
      if (refreshed) {
        notifyDataRefreshed();
      }
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
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-headline">Fila de picking</CardTitle>
            <Button size="sm" variant="outline" onClick={() => loadData({ skipLoading: true })} disabled={loading}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <CardDescription>Filtre por prontidao e conclua separacao com baixa de saida simulada.</CardDescription>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Filtro de prontidão</Label>
            <Select value={filter} onValueChange={(value) => setFilter(value as 'READY_FULL' | 'READY_PARTIAL' | 'ALL')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="READY_FULL">{readinessTabLabel.READY_FULL}</SelectItem>
                <SelectItem value="READY_PARTIAL">{readinessTabLabel.READY_PARTIAL}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {queue.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Fila sem pedidos" description="Nao ha pedidos prontos para picking no momento." className="min-h-[120px]" />
          ) : (
            queue.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`w-full rounded-xl border border-border/70 bg-muted/20 p-2 text-left transition hover:border-primary sm:p-3 ${selectedOrderId === order.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium" title={order.orderNumber}>{order.orderNumber}</p>
                  {order.labelPrintCount > 0 && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">LBL</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground" title={order.clientName}>{order.clientName} - {formatDate(order.orderDate)}</p>
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
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {
                    (() => {
                      const hasProductionBlocking = selected.items.some((it) => it.qtyToProduce > 0);
                      const isLabelPrinted = (selected.labelPrintCount ?? 0) > 0;
                      const isFullyTyped = selected.items.every(item => item.qtySeparated >= item.qtyReservedFromStock);
                      const canConclude = isLabelPrinted && isFullyTyped && !hasProductionBlocking;

                      return (
                        <>
                          <Button
                            className="w-full sm:w-auto"
                            variant="outline"
                            onClick={handlePrintLabels}
                            disabled={hasProductionBlocking}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {isLabelPrinted ? 'Reimprimir etiquetas' : 'Imprimir etiquetas'}
                          </Button>
                          <Button
                            className="w-full sm:w-auto"
                            onClick={() => concludePicking(selected.id)}
                            disabled={!canConclude}
                          >
                            {isFullyTyped ? 'Concluir picking' : 'Aguardando quantidades'}
                          </Button>
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
                    <TableHead>Desc</TableHead>
                    <TableHead>Cor</TableHead>
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
                          <TableCell className="max-w-[120px]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="truncate font-medium">{item.materialName}</p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{item.materialName}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <p className="text-[10px] text-muted-foreground">{item.uom}</p>
                            {item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0 ? (
                              <div className="mt-1">
                                <Badge variant="outline">Em produção</Badge>
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-left text-sm text-muted-foreground">{item.description ?? item.materialName}</TableCell>
                          <TableCell className="text-left text-sm text-muted-foreground">{item.color}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              id={`weight-${item.id}`}
                              type="number"
                              step="0.01"
                              min={0}
                              className="ml-auto w-full max-w-[5.5rem] text-right"
                              value={item.separatedWeight ?? ''}
                              onChange={(e) => updateSeparatedWeightLocal(selected.id, item.id, Number(e.target.value))}
                              onBlur={(e) => commitSeparatedWeight(selected.id, item.id, Number(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  document.getElementById(`qty-${item.id}`)?.focus();
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">{item.qtyRequested}</TableCell>
                          <TableCell className="text-right">{item.qtyReservedFromStock}</TableCell>
                          <TableCell className="text-right">{currentStock?.onHand ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              id={`qty-${item.id}`}
                              type="number"
                              min={0}
                              max={item.qtyReservedFromStock}
                              className="ml-auto w-full max-w-[5.5rem] text-right font-bold"
                              value={item.qtySeparated}
                              onChange={(e) => updateSeparatedQtyLocal(selected.id, item.id, Number(e.target.value))}
                              onBlur={(e) => commitSeparatedQty(selected.id, item.id, Number(e.target.value))}
                              readOnly={item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0}
                              disabled={item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // Focus next item's weight
                                  const itemIdx = selected.items.findIndex(it => it.id === item.id);
                                  const nextItem = selected.items[itemIdx + 1];
                                  if (nextItem) {
                                    document.getElementById(`weight-${nextItem.id}`)?.focus();
                                  }
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="space-y-2">
                              <Label>Condições do item</Label>
                              {item.conditions && item.conditions.length > 0 ? (
                                item.conditions.map((cond, idx) => (
                                  <div key={idx} className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
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
