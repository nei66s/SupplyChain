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

import { generateLabelPdf } from '@/lib/domain/labels';
import { readinessLabel, readinessTabLabel } from '@/lib/domain/i18n';
import { notifyDataRefreshed } from '@/lib/data-refresh';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Order, StockBalance, User } from '@/lib/domain/types';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { applyPickingDrafts, pruneResolvedPickingDrafts } from '@/lib/frontend/picking-client-state';
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
export default function PickingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const dataFingerprintRef = useRef('');
  const pendingPickingDraftsRef = useRef<Record<string, Record<string, { qtySeparated?: number; separatedWeight?: number }>>>({});
  const loadDataRequestRef = useRef(0);
  const appliedLoadDataRequestRef = useRef(0);

  const [filter, setFilter] = React.useState<'READY_FULL' | 'READY_PARTIAL' | 'ALL'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  const loadData = useCallback(async () => {
    const requestId = ++loadDataRequestRef.current;
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
      if (requestId < appliedLoadDataRequestRef.current) {
        return;
      }
      appliedLoadDataRequestRef.current = requestId;

      const nextOrders = Array.isArray(ordersPayload) ? ordersPayload : [];
      const nextUsers = Array.isArray(usersPayload) ? usersPayload : [];
      const nextStockBalances = Array.isArray(inventoryPayload.stockBalances)
        ? inventoryPayload.stockBalances
        : [];

      pendingPickingDraftsRef.current = pruneResolvedPickingDrafts(nextOrders, pendingPickingDraftsRef.current);
      const mergedOrders = applyPickingDrafts(nextOrders, pendingPickingDraftsRef.current);

      const nextFingerprint = JSON.stringify({
        orders: mergedOrders,
        users: nextUsers,
        stockBalances: nextStockBalances,
      });

      const isTyping = document.activeElement?.tagName === 'INPUT';

      if (nextFingerprint !== dataFingerprintRef.current && !isTyping) {
        dataFingerprintRef.current = nextFingerprint;
        setOrders(mergedOrders);
        setUsers(nextUsers);
        setStockBalances(nextStockBalances);
        refreshed = true;
      }
    } finally {
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
  const detailColSpan = 7;
  const usesMeasuredUom = useCallback((uom?: string) => {
    const normalized = String(uom ?? '').trim().toUpperCase();
    return normalized === 'KG' || normalized === 'M';
  }, []);
  const requestedValue = useCallback((item: Order['items'][number]) => {
    return usesMeasuredUom(item.uom)
      ? Number(item.qtyRequested ?? item.requestedWeight ?? 0)
      : Number(item.qtyRequested ?? 0);
  }, [usesMeasuredUom]);
  const separatedValue = useCallback((item: Order['items'][number]) => {
    return usesMeasuredUom(item.uom)
      ? Number(item.qtySeparated ?? item.separatedWeight ?? 0)
      : Number(item.qtySeparated ?? 0);
  }, [usesMeasuredUom]);
  const separatedInputValue = useCallback((item: Order['items'][number]) => {
    const value = separatedValue(item);
    return value > 0 ? String(value) : '';
  }, [separatedValue]);
  const reservedValue = useCallback((item: Order['items'][number]) => {
    return Number(item.qtyReservedFromStock ?? 0);
  }, []);
  const completionLabel = 'Aguardando preenchimento da separacao';

  const isItemReadyForCompletion = useCallback((item: Order['items'][number]) => {
    if (usesMeasuredUom(item.uom)) return Number(item.qtySeparated ?? item.separatedWeight ?? 0) > 0;
    return item.qtySeparated >= item.qtyReservedFromStock;
  }, [usesMeasuredUom]);

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

  const updateSeparatedQtyLocal = (orderId: string, itemId: string, qty?: number) => {
    pendingPickingDraftsRef.current[orderId] = {
      ...(pendingPickingDraftsRef.current[orderId] ?? {}),
      [itemId]: {
        ...(pendingPickingDraftsRef.current[orderId]?.[itemId] ?? {}),
        qtySeparated: qty,
      },
    };
    setOrders((prev) =>
      prev.map((order) =>
        order.id !== orderId
          ? order
          : {
              ...order,
              items: order.items.map((item) =>
                item.id !== itemId ? item : { ...item, qtySeparated: qty as number }
              ),
            }
      )
    );
  };

  const updateSeparatedWeightLocal = (orderId: string, itemId: string, weight?: number, autoSeparatedQty?: number) => {
    pendingPickingDraftsRef.current[orderId] = {
      ...(pendingPickingDraftsRef.current[orderId] ?? {}),
      [itemId]: {
        ...(pendingPickingDraftsRef.current[orderId]?.[itemId] ?? {}),
        separatedWeight: weight,
        ...(autoSeparatedQty !== undefined ? { qtySeparated: autoSeparatedQty } : {}),
      },
    };
    setOrders((prev) =>
      prev.map((order) =>
        order.id !== orderId
          ? order
          : {
              ...order,
              items: order.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      separatedWeight: weight as number | undefined,
                      qtySeparated:
                        autoSeparatedQty !== undefined ? autoSeparatedQty : item.qtySeparated,
                    }
              ),
            }
      )
    );
  };

  const commitSeparatedQty = async (orderId: string, itemId: string, qty?: number) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_separated_qty', itemId, qtySeparated: qty ?? 0 }),
    });
    await loadData();
  };

  const commitSeparatedWeight = async (orderId: string, itemId: string, weight?: number, autoSeparatedQty?: number) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_separated_weight', itemId, separatedWeight: weight ?? 0 }),
    });
    if (autoSeparatedQty !== undefined) {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_separated_qty', itemId, qtySeparated: autoSeparatedQty ?? 0 }),
      });
    }
    await loadData();
  };

  const updateSeparatedValueLocal = useCallback((orderId: string, item: Order['items'][number], value?: number) => {
    if (usesMeasuredUom(item.uom)) {
      updateSeparatedWeightLocal(orderId, item.id, value, item.qtyReservedFromStock);
      return;
    }
    updateSeparatedQtyLocal(orderId, item.id, value);
  }, [updateSeparatedQtyLocal, updateSeparatedWeightLocal, usesMeasuredUom]);

  const commitSeparatedValue = useCallback(async (orderId: string, item: Order['items'][number], value?: number) => {
    if (usesMeasuredUom(item.uom)) {
      await commitSeparatedWeight(orderId, item.id, value, item.qtyReservedFromStock);
      return;
    }
    await commitSeparatedQty(orderId, item.id, value);
  }, [commitSeparatedQty, commitSeparatedWeight, usesMeasuredUom]);

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
          </div>
          <CardDescription>Filtre por prontidao e conclua separacao com baixa de saida simulada.</CardDescription>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Filtro de prontidao</Label>
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
                {(() => {
                  return (
                    <>
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
                    </>
                  );
                })()}
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
                  {(() => {
                    const hasProductionBlocking = selected.items.some((it) => it.qtyToProduce > 0);
                    const isPickingLabelPrinted = !!selected.picking_label_printed;
                    const isFullyTyped = selected.items.every((item) => {
                      const isBlocked = item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0;
                      return isBlocked ? true : isItemReadyForCompletion(item);
                    });
                    const canConclude = isPickingLabelPrinted && isFullyTyped && !hasProductionBlocking;

                    return (
                      <>
                        <Button
                          className="w-full sm:w-auto"
                          variant="outline"
                          onClick={handlePrintLabels}
                          disabled={hasProductionBlocking}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {isPickingLabelPrinted ? 'Reimprimir etiquetas de separacao' : 'Imprimir etiquetas de separacao'}
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => concludePicking(selected.id)}
                          disabled={!canConclude}
                        >
                          {isFullyTyped ? 'Concluir picking' : completionLabel}
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Desc</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead className="text-right">Solicitado</TableHead>
                      <TableHead className="text-right">Reservado</TableHead>
                      <TableHead className="text-right">Estoque atual</TableHead>
                      <TableHead className="text-right">Separado</TableHead>
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
                              <p className="text-[10px] font-medium text-sky-700 dark:text-sky-300">
                                Solicitado: {requestedValue(item)} {item.uom}
                              </p>
                              {item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0 ? (
                                <div className="mt-1">
                                  <Badge variant="outline">Em producao</Badge>
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-left text-sm text-muted-foreground">{item.description ?? item.materialName}</TableCell>
                            <TableCell className="text-left text-sm text-muted-foreground">{item.color}</TableCell>
                            <TableCell className="text-right">
                              <div>{requestedValue(item)} {item.uom}</div>
                            </TableCell>
                            <TableCell className="text-right">{reservedValue(item)} {item.uom}</TableCell>
                            <TableCell className="text-right">{currentStock?.onHand ?? 0}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                id={`separated-${item.id}`}
                                type="number"
                                step={usesMeasuredUom(item.uom) ? '0.01' : undefined}
                                min={0}
                                max={!usesMeasuredUom(item.uom) ? item.qtyReservedFromStock : undefined}
                                className="ml-auto w-full max-w-[5.5rem] text-right font-bold"
                                value={separatedInputValue(item)}
                                onChange={(e) => {
                                  const rawValue = e.target.value;
                                  const nextValue = rawValue === '' ? undefined : Number(rawValue);
                                  updateSeparatedValueLocal(selected.id, item, Number.isFinite(nextValue as number) ? nextValue : undefined);
                                }}
                                onBlur={(e) => {
                                  const rawValue = e.target.value;
                                  const nextValue = rawValue === '' ? undefined : Number(rawValue);
                                  void commitSeparatedValue(selected.id, item, Number.isFinite(nextValue as number) ? nextValue : undefined);
                                }}
                                readOnly={item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0}
                                disabled={item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0}
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={detailColSpan} className="bg-muted/30">
                              <div className="space-y-2">
                                <Label>Condicoes do item</Label>
                                {item.conditions && item.conditions.length > 0 ? (
                                  item.conditions.map((cond, idx) => (
                                    <div key={idx} className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                      <Input placeholder="Campo" value={cond.key} readOnly />
                                      <Input placeholder="Valor" value={cond.value} readOnly />
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground">Sem condicoes adicionadas.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 gap-4 md:hidden">
                {selected.items.map((item) => {
                  const currentStock = stockByMaterial.get(item.materialId);
                  const isBlocked = item.qtyToProduce > 0 && item.qtyReservedFromStock <= 0;
                  return (
                    <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/5 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{item.materialName}</p>
                          <p className="text-[10px] text-slate-500">{item.description || item.materialName}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">{item.uom}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2">
                          <span className="text-[8px] uppercase font-bold text-slate-400">Solicitado</span>
                          <span className="text-sm font-bold">{requestedValue(item)} {item.uom}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-2">
                          <span className="text-[8px] uppercase font-bold text-indigo-500">Reservado</span>
                          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{reservedValue(item)} {item.uom}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-2">
                          <span className="text-[8px] uppercase font-bold text-slate-400">Estoque</span>
                          <span className="text-sm font-bold">{currentStock?.onHand ?? 0}</span>
                        </div>
                      </div>

                      {isBlocked ? (
                        <div className="flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-3">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-tighter">Aguardando producao</p>
                        </div>
                      ) : (
                        <div className="grid gap-3 grid-cols-1">
                          <div className="space-y-1.5">
                            <Label htmlFor={`separated-mob-${item.id}`} className="text-[10px] font-bold uppercase text-indigo-500">
                              Separado
                            </Label>
                            <Input
                              id={`separated-mob-${item.id}`}
                              type="number"
                              step={usesMeasuredUom(item.uom) ? '0.01' : undefined}
                              className="h-11 text-center font-bold text-lg border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500"
                              value={separatedInputValue(item)}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                const nextValue = rawValue === '' ? undefined : Number(rawValue);
                                updateSeparatedValueLocal(selected.id, item, Number.isFinite(nextValue as number) ? nextValue : undefined);
                              }}
                              onBlur={(e) => {
                                const rawValue = e.target.value;
                                const nextValue = rawValue === '' ? undefined : Number(rawValue);
                                void commitSeparatedValue(selected.id, item, Number.isFinite(nextValue as number) ? nextValue : undefined);
                              }}
                              readOnly={isBlocked}
                              disabled={isBlocked}
                            />
                          </div>
                        </div>
                      )}

                      {item.conditions && item.conditions.length > 0 ? (
                        <div className="rounded-lg bg-slate-100/50 dark:bg-slate-800/50 p-2 space-y-1">
                          {item.conditions.map((condition, index) => (
                            <p key={index} className="text-[10px] text-slate-600 dark:text-slate-400">
                              <span className="font-bold uppercase">{condition.key}:</span> {condition.value}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

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
