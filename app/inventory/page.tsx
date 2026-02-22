'use client';

import { Fragment, useCallback, useMemo, useState, useEffect } from 'react';
import { Bell, Inbox, Warehouse, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
const MrpPanel = dynamic(() => import('@/components/mrp-panel'), { ssr: false });
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { notificationTypeLabel } from '@/lib/domain/i18n';
import {
  ConditionVariant,
  Material,
  Notification,
  Order,
  StockBalance,
  StockReservation,
} from '@/lib/domain/types';

export default function InventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [stockReservations, setStockReservations] = useState<StockReservation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [conditionVariants, setConditionVariants] = useState<ConditionVariant[]>([]);
  const [expandedVariantRows, setExpandedVariantRows] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      const [inventoryRes, notificationsRes, ordersRes] = await Promise.all([
        fetch('/api/inventory', { cache: 'no-store' }),
        fetch('/api/notifications', { cache: 'no-store' }),
        fetch('/api/orders', { cache: 'no-store' }),
      ]);
      if (inventoryRes.ok) {
        const payload = await inventoryRes.json();
        setMaterials(Array.isArray(payload.materials) ? payload.materials : []);
        setStockBalances(Array.isArray(payload.stockBalances) ? payload.stockBalances : []);
        setStockReservations(Array.isArray(payload.stockReservations) ? payload.stockReservations : []);
        setConditionVariants(
          Array.isArray(payload.conditionVariants) ? payload.conditionVariants : []
        );
      }
      if (notificationsRes.ok) {
        const payload = await notificationsRes.json();
        setNotifications(Array.isArray(payload) ? payload : []);
      }
      if (ordersRes.ok) {
        const payload = await ordersRes.json();
        setOrders(Array.isArray(payload) ? payload : []);
      }
    } catch (err) {
      console.error('inventory load failed', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadData();
    })()
  }, [loadData]);

  const stockView = useMemo(() => {
    const materialsById = Object.fromEntries(materials.map((m) => [m.id, m]));
    return stockBalances.map((balance) => {
      const material = materialsById[balance.materialId];
      const productionReserved = (balance as any).productionReserved ?? 0;
      const available = Math.max(0, balance.onHand - (balance.reservedTotal ?? 0) - productionReserved);
      const activeReservations = stockReservations
        .filter((reservation) => reservation.materialId === balance.materialId)
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
      return { ...balance, material, available, activeReservations };
    });
  }, [materials, stockBalances, stockReservations]);

  const variantsByMaterial = useMemo(() => {
    const map: Record<string, ConditionVariant[]> = {};
    conditionVariants.forEach((variant) => {
      if (!map[variant.materialId]) map[variant.materialId] = [];
      map[variant.materialId].push(variant);
    });
    return map;
  }, [conditionVariants]);

  const toggleVariantRow = useCallback((materialId: string) => {
    setExpandedVariantRows((prev) => ({
      ...prev,
      [materialId]: !prev[materialId],
    }));
  }, []);

  const markNotification = async (id: string, read: boolean) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read }),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: read ? new Date().toISOString() : undefined } : n)));
  };

  return (
    <Tabs defaultValue="stock" className="space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="stock">Estoque</TabsTrigger>
        <TabsTrigger value="reservations">Reservas</TabsTrigger>
        <TabsTrigger value="inbox" id="inbox">Inbox</TabsTrigger>
        <TabsTrigger value="mrp">MRP</TabsTrigger>
      </TabsList>

      <TabsContent value="stock">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Saldo de estoque</CardTitle>
            <CardDescription>Em estoque, reservado e disponível calculados em tempo real.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead className="w-20"></TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Em estoque</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Reservado produção</TableHead>
                  <TableHead className="text-right">Disponivel</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockView.map((entry) => {
                  const material = entry.material;
                  const statusVariant = entry.available <= 0 ? 'destructive' : material && entry.available <= material.minStock ? 'warning' : 'positive';
                  const variantRows = variantsByMaterial[entry.materialId] ?? [];
                  const hasVariants = variantRows.length > 0;
                  const isExpanded = Boolean(expandedVariantRows[entry.materialId] && hasVariants);

                  return (
                    <Fragment key={entry.materialId}>
                      <TableRow>
                        <TableCell className="pr-2 align-top">
                          {hasVariants ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleVariantRow(entry.materialId)}
                              className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] opacity-100 shadow"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                              Vertentes
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">â€”</span>
                          )}
                        </TableCell>
                        <TableCell>
                        <p className="font-medium">{material?.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.materialId} - min {material?.minStock} - ponto de pedido {material?.reorderPoint}</p>
                      </TableCell>
                      <TableCell className="text-right">{entry.onHand}</TableCell>
                      <TableCell className="text-right">{entry.reservedTotal}</TableCell>
                      <TableCell className="text-right">{entry.productionReserved ?? 0}</TableCell>
                      <TableCell className="text-right font-semibold">{entry.available}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusVariant}>{statusVariant === 'destructive' ? 'RUPTURA' : statusVariant === 'warning' ? 'BAIXO' : 'OK'}</Badge>
                      </TableCell>
                      </TableRow>
                      {isExpanded && variantRows.length > 0 && (
                        <TableRow key={`${entry.materialId}-variants`}>
                          <TableCell className="border-none p-0" />
                          <TableCell colSpan={6} className="border-none bg-muted/10 px-3 py-4 sm:px-6">
                          <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Materiais Condicionados</p>
                            <div className="grid gap-3 md:grid-cols-2">
                              {variantRows.map((variant, variantIndex) => {
                                const summary =
                                  variant.conditions
                                    .map((cond) => `${cond.key}: ${cond.value}`)
                                    .filter(Boolean)
                                    .join(' â€¢ ') || 'Sem condições';
                                const variantKey = `${entry.materialId}-${variantIndex}-${summary}`;
                                return (
                                  <div key={variantKey} className="rounded-2xl border border-border bg-background/70 p-3 shadow-sm">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold">{summary}</p>
                                      <span className="text-xs text-muted-foreground">
                                        Solic: {variant.quantityRequested}
                                      </span>
                                    </div>
                                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Reservado</p>
                                        <p className="text-sm font-semibold text-foreground">{variant.reservedFromStock}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Produção</p>
                                        <p className="text-sm font-semibold text-amber-600">{variant.qtyToProduce}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Total</p>
                                        <p className="text-sm font-semibold text-foreground">{variant.quantityRequested}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reservations">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Reservas ativas</CardTitle>
            <CardDescription>TTL de 5 minutos com renovacao por heartbeat. Limpeza automatica a cada 30s.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Expira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="border-none py-8">
                      <EmptyState icon={Warehouse} title="Sem reservas no momento" description="As reservas ativas de estoque aparecerao aqui." className="min-h-[120px]" />
                    </TableCell>
                  </TableRow>
                ) : (
                  stockReservations.map((reservation) => {
                    const order = orders.find((item) => item.id === reservation.orderId);
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell>{reservation.materialId}</TableCell>
                        <TableCell>{order?.orderNumber ?? reservation.orderId}</TableCell>
                        <TableCell>{reservation.userName}</TableCell>
                        <TableCell className="text-right">{reservation.qty}</TableCell>
                        <TableCell>{formatDate(reservation.expiresAt)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inbox">
        <Card id="inbox">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><Bell className="h-5 w-5" /> Notificacoes</CardTitle>
            <CardDescription>Inbox interna para alertas e disponibilidade para separacao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <EmptyState icon={Inbox} title="Inbox vazia" description="Novas notificacoes operacionais aparecerao aqui." className="min-h-[130px]" />
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(notification.createdAt)} - {notificationTypeLabel(notification.type)}</p>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      size="sm"
                      variant={notification.readAt ? 'outline' : 'default'}
                      onClick={() => markNotification(notification.id, !notification.readAt)}
                    >
                      {notification.readAt ? 'Marcar como nao lida' : 'Marcar como lida'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mrp">
        {/* Lazy-loaded MRP panel */}
        <div>
          <MrpPanel />
        </div>
      </TabsContent>
    </Tabs>
  );
}
