"use client";

import { AlertTriangle, Factory, ShoppingCart, ShieldAlert, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer } from '@/components/ui/chart';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { formatDate } from '@/lib/utils';
import { readinessLabel, dashboardLabels } from '@/lib/domain/i18n';
import { DashboardData } from '@/lib/repository/dashboard';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

type DashboardClientProps = {
  data: DashboardData;
};

const chartPalette = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#ec4899', '#14b8a6'];
const colorForKey = (key?: string | number) => {
  if (key === undefined || key === null) return chartPalette[0];
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  const idx = Math.abs(h) % chartPalette.length;
  return chartPalette[idx];
};

const glassyTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(200, 200, 200, 0.3)',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    color: '#0f172a'
  },
  itemStyle: { color: '#0f172a', fontWeight: 500 }
};

const parseBucketToDate = (label?: string | number) => {
  if (label === undefined || label === null) return null;
  const s = String(label);
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]) - 1;
    const d = new Date(y, m, 1);
    return isNaN(d.getTime()) ? null : d;
  }
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    const d = new Date(y, m, day);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const SEPARATION_STATUSES = new Set(['ABERTO', 'EM_PICKING', 'SAIDA_CONCLUIDA']);

const isFinalizedStatus = (status?: string | null) => status === 'FINALIZADO' || status === 'SAIDA_CONCLUIDA';
const isInSeparationStatus = (status?: string | null) => (status ? SEPARATION_STATUSES.has(status) : false);

export default function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const materialsById = useMemo(
    () => Object.fromEntries(data.materials.map((material) => [material.id, material])),
    [data.materials]
  );

  const stockView = useMemo(() => {
    return data.stockBalances.map((balance) => {
      const material = materialsById[balance.materialId];
      const productionReserved = (balance as any).productionReserved ?? 0;
      const available = Math.max(0, balance.onHand - balance.reservedTotal - productionReserved);
      const activeReservations = data.stockReservations
        .filter((reservation) => reservation.materialId === balance.materialId)
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
      return { ...balance, material, available, activeReservations };
    });
  }, [data.stockBalances, data.stockReservations, materialsById]);

  const orders = data.orders;
  const productionTasks = data.productionTasks;

  const openOrders = orders.filter((item) => ['ABERTO', 'EM_PICKING'].includes(item.status)).length;
  const tasksPending = productionTasks.filter((item) => item.status !== 'DONE').length;
  const unread = data.notifications.filter((item) => !item.readAt).length;

  const lowStock = stockView.filter((item) => item.material && item.available <= item.material.minStock);
  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
        .slice(0, 6),
    [orders]
  );

  const ordersBySellerMap: Record<string, number> = {};
  orders.forEach((order) => {
    const key = order.createdBy || 'Sem registro';
    ordersBySellerMap[key] = (ordersBySellerMap[key] || 0) + 1;
  });
  const ordersBySeller = Object.entries(ordersBySellerMap).map(([id, value]) => ({
    name: data.users.find((u) => u.id === id)?.name || id,
    value,
  }));

  const ordersByPickerMap: Record<string, number> = {};
  orders.forEach((order) => {
    if (!order.pickerId) return;
    ordersByPickerMap[order.pickerId] = (ordersByPickerMap[order.pickerId] || 0) + 1;
  });
  const ordersByPicker = Object.entries(ordersByPickerMap).map(([id, value]) => ({
    name: data.users.find((u) => u.id === id)?.name || id,
    value,
  }));

  const ordersStatusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((order) => {
      map[order.status] = (map[order.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const agingBuckets = useMemo(() => {
    const buckets = { '0-3': 0, '4-7': 0, '8-14': 0, '15+': 0 } as Record<string, number>;
    const now = Date.now();
    orders.forEach((order) => {
      const days = Math.floor((now - new Date(order.orderDate).getTime()) / (24 * 3600 * 1000));
      if (days <= 3) buckets['0-3']++;
      else if (days <= 7) buckets['4-7']++;
      else if (days <= 14) buckets['8-14']++;
      else buckets['15+']++;
    });
    return Object.entries(buckets).map(([bucket, value]) => ({ bucket, value }));
  }, [orders]);

  const gaugeRisk = useMemo(() => {
    const total = data.materials.length || 1;
    const low = lowStock.length;
    return Math.round((low / total) * 100);
  }, [data.materials, lowStock]);

  const last14 = useMemo(() => {
    const arr: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      arr.push(d.toISOString().slice(0, 10));
    }
    return arr;
  }, []);

  const fulfillmentSeries = useMemo(
    () =>
      last14.map((date) => {
        const ordersOnDay = orders.filter((order) => order.orderDate.slice(0, 10) === date);
        const finished = ordersOnDay.filter(
          (order) => order.status === 'FINALIZADO' || order.status === 'SAIDA_CONCLUIDA'
        ).length;
        const rate = ordersOnDay.length === 0 ? 0 : Math.round((finished / ordersOnDay.length) * 100);
        return { date, rate };
      }),
    [last14, orders]
  );

  const dateFmt = useMemo(() => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }), []);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }), []);


  const filteredRecentOrders = recentOrders;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.trashedAt) return false;
      const isFinalized = order.status === 'FINALIZADO' || order.status === 'SAIDA_CONCLUIDA';
      return !isFinalized;
    });
  }, [orders]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null);
      return;
    }
    if (!selectedOrderId || !filteredOrders.find((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0]?.id ?? null);
    }
  }, [filteredOrders, selectedOrderId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 15000);
    return () => window.clearInterval(id);
  }, [router]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const stockByMaterial = useMemo(() => {
    const map = new Map<string, { onHand: number; reservedTotal: number; available: number }>();
    data.stockBalances.forEach((balance) => {
      map.set(balance.materialId, {
        onHand: balance.onHand,
        reservedTotal: balance.reservedTotal,
        available: Math.max(0, balance.onHand - balance.reservedTotal),
      });
    });
    return map;
  }, [data.stockBalances]);

  const producingSet = useMemo(
    () => new Set(productionTasks.filter((task) => task.status !== 'DONE').map((task) => task.orderId)),
    [productionTasks]
  );

  const finishedCount = orders.filter((order) => isFinalizedStatus(order.status)).length;
  const ordersInSeparation = orders.filter((order) => isInSeparationStatus(order.status)).length;
  const ordersComparisonSeries = useMemo(() => {
    const buckets: string[] = [];
    if (period === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      for (let day = 1; day <= last.getDate(); day++) {
        const entry = new Date(year, month - 1, day).toISOString().slice(0, 10);
        buckets.push(entry);
      }
    } else {
      if (orders.length === 0) return [];
      const dates = orders.map((order) => new Date(order.orderDate));
      const min = new Date(Math.min(...dates.map((d) => d.getTime())));
      const max = new Date(Math.max(...dates.map((d) => d.getTime())));
      const current = new Date(min.getFullYear(), min.getMonth(), 1);
      const end = new Date(max.getFullYear(), max.getMonth(), 1);
      while (current <= end) {
        buckets.push(current.toISOString().slice(0, 7));
        current.setMonth(current.getMonth() + 1);
      }
    }

    return buckets.map((bucket) => {
      const ordersOnBucket =
        period === 'all'
          ? orders.filter((order) => order.orderDate.slice(0, 7) === bucket)
          : orders.filter((order) => order.orderDate.slice(0, 10) === bucket);
      const created = ordersOnBucket.length;
      const inSeparation = ordersOnBucket.filter((order) => isInSeparationStatus(order.status)).length;
      const finalized = ordersOnBucket.filter((order) => isFinalizedStatus(order.status)).length;
      return { date: bucket, created, inSeparation, finalized };
    });
  }, [orders, period, selectedMonth]);

  const formatBucketLabel = (label?: string | number) => {
    const parsed = parseBucketToDate(label);
    if (!parsed) return String(label ?? '');
    return period === 'all' ? monthFmt.format(parsed) : dateFmt.format(parsed);
  };

  const ordersComparisonSeriesHasData = ordersComparisonSeries.every(
    (serie) => serie.created === 0 && serie.inSeparation === 0 && serie.finalized === 0
  );

  return (
    <div className="relative w-full space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-5 mb-6 px-1">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold tracking-wide uppercase shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Tempo real
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 dark:text-slate-100">
            Painel de <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-400 dark:to-blue-300">Indicadores</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
            Última atualização: {formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section aria-labelledby="overview">
          <h3 id="overview" className="font-headline text-lg">Overview</h3>
          <p className="text-sm text-muted-foreground mt-1">Visão consolidada com KPIs principais e atalhos.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KpiCard
              title="Pedidos abertos"
              value={openOrders}
              icon={ShoppingCart}
              onClick={() => router.push('/orders?view=open&sub=all')}
            />
            <KpiCard
              title="Pedidos em separação"
              value={ordersInSeparation}
              icon={ShoppingCart}
              unit="un"
              onClick={() => router.push('/orders?filter=in_separation')}
            />
            <KpiCard
              title="Pedidos finalizados"
              value={finishedCount}
              icon={ShieldAlert}
              tone="success"
              unit="un"
              onClick={() => router.push('/orders?view=finalized')}
            />
            <KpiCard
              title="Tarefas de produção"
              value={tasksPending}
              icon={Factory}
              tone="info"
              onClick={() => router.push('/production')}
            />
            <KpiCard
              title="Estoque crítico"
              value={lowStock.length}
              icon={ShieldAlert}
              tone={lowStock.length > 0 ? 'warning' : 'success'}
              unit="un"
              onClick={() => router.push('/materials?filter=lowstock')}
            />
            <KpiCard
              title="Alertas não lidos"
              value={unread}
              icon={AlertTriangle}
              tone="warning"
              onClick={() => router.push('/notifications')}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Volume de pedidos</CardTitle>
                    <CardDescription>Comparativo: Criados / Em separação / Finalizados</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-md border border-border/70 bg-muted/20 p-1">
                      <button
                        className={`px-3 py-1 text-sm ${period === 'month' ? 'bg-muted/80 rounded' : ''}`}
                        onClick={() => setPeriod('month')}
                      >
                        Mês
                      </button>
                      <button
                        className={`px-3 py-1 text-sm ${period === 'all' ? 'bg-muted/80 rounded' : ''}`}
                        onClick={() => setPeriod('all')}
                      >
                        Tudo
                      </button>
                    </div>
                    {period === 'month' && (
                      <Input
                        type="month"
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        className="w-full min-w-0 sm:w-auto"
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ordersComparisonSeriesHasData ? (
                  <EmptyState title="Sem pedidos recentes" description="Nenhum pedido criado nos últimos dias." />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={ordersComparisonSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                      <XAxis dataKey="date" tickFormatter={formatBucketLabel} axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dx={-10} />
                      <Tooltip labelFormatter={formatBucketLabel} {...glassyTooltipProps} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="created" name="Criados" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                      <Line type="monotone" dataKey="inSeparation" name="Em separação" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }} />
                      <Line type="monotone" dataKey="finalized" name="Finalizados" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment rate (últimos 14 dias)</CardTitle>
                <CardDescription>% de pedidos finalizados por dia</CardDescription>
              </CardHeader>
              <CardContent>
                {fulfillmentSeries.every((serie) => serie.rate === 0) ? (
                  <EmptyState title="Sem dados de finalização" description="Nenhum pedido finalizado nos últimos dias." />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={fulfillmentSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                      <XAxis dataKey="date" tickFormatter={(value) => dateFmt.format(new Date(value))} axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dy={10} />
                      <YAxis unit="%" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dx={-10} />
                      <Tooltip labelFormatter={(value) => dateFmt.format(new Date(String(value)))} {...glassyTooltipProps} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl">{dashboardLabels.recentOrdersTitle}</CardTitle>
                <CardDescription>{dashboardLabels.recentOrdersDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredRecentOrders.length === 0 ? (
                  <EmptyState
                    icon={ShoppingCart}
                    title="Sem pedidos recentes"
                    description="Novos pedidos aparecerão aqui assim que forem registrados."
                  />
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {filteredRecentOrders.map((order) => (
                      <div
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 transition hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {order.orderNumber} - {order.clientName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.orderDate)} - {order.items.length} itens
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{order.status}</Badge>
                          <Badge
                            variant={
                              order.readiness === 'READY_FULL'
                                ? 'positive'
                                : order.readiness === 'READY_PARTIAL'
                                  ? 'warning'
                                  : 'outline'
                            }
                          >
                            {readinessLabel(order.readiness)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl">{dashboardLabels.lowStockTitle}</CardTitle>
                <CardDescription>{dashboardLabels.lowStockDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStock.length === 0 ? (
                  <EmptyState
                    icon={ShieldAlert}
                    title="Sem materiais críticos"
                    description="Todos os itens estão dentro do nível mínimo configurado."
                  />
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-3">
                    {lowStock.map((entry) => (
                      <div key={entry.materialId} className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{entry.material?.name}</p>
                          <Badge variant={entry.available <= 0 ? 'destructive' : 'warning'}>{entry.available}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Em estoque {entry.onHand} - Reservado {entry.reservedTotal} - Mínimo {entry.material?.minStock}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por status</CardTitle>
            <CardDescription>Proporção de pedidos por status</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersStatusCounts.length === 0 ? (
              <EmptyState title="Sem dados" description="Nenhum pedido." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ordersStatusCounts} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dx={-10} />
                  <Tooltip {...glassyTooltipProps} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="value" radius={6}>
                    {ordersStatusCounts.map((_, index) => (
                      <Cell key={`status-${index}`} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aging de pedidos</CardTitle>
            <CardDescription>Distribuição por faixa de dias</CardDescription>
          </CardHeader>
          <CardContent>
            {agingBuckets.every((bucket) => bucket.value === 0) ? (
              <EmptyState title="Sem dados" description="Nenhum pedido." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={agingBuckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dx={-10} />
                  <Tooltip {...glassyTooltipProps} />
                  <Line type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#f43f5e' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risco de ruptura</CardTitle>
            <CardDescription>% de materiais abaixo do mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={180} height={120}>
                <BarChart
                  layout="vertical"
                  data={[{ name: 'Risco', value: gaugeRisk }]}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip cursor={{ fill: 'transparent' }} {...glassyTooltipProps} formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="value" fill={gaugeRisk > 30 ? '#ef4444' : gaugeRisk > 10 ? '#f59e0b' : '#10b981'} radius={4} background={{ fill: 'rgba(0,0,0,0.05)', radius: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center mt-2 font-semibold">{gaugeRisk}% em risco</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dashboardLabels.sellersTitle}</CardTitle>
            <CardDescription>{dashboardLabels.sellersDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ sellers: { label: 'Vendedores' } }}>
              {ordersBySeller.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Sem dados" description="Nenhum pedido registrado." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart layout="vertical" data={ordersBySeller} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12, fontWeight: 500 }} />
                    <Tooltip {...glassyTooltipProps} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="value" radius={4}>
                      {ordersBySeller.map((entry) => (
                        <Cell key={`seller-${entry.name}`} fill={colorForKey(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dashboardLabels.pickersTitle}</CardTitle>
            <CardDescription>{dashboardLabels.pickersDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ pickers: { label: 'Separadores' } }}>
              {ordersByPicker.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Sem dados" description="Nenhuma separação registrada." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart layout="vertical" data={ordersByPicker} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12, fontWeight: 500 }} />
                    <Tooltip {...glassyTooltipProps} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="value" radius={4}>
                      {ordersByPicker.map((entry) => (
                        <Cell key={`picker-${entry.name}`} fill={colorForKey(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


