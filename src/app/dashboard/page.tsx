"use client";

import { AlertTriangle, Factory, Package, ShoppingCart, ShieldAlert, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePilotDerived, usePilotStore } from '@/lib/pilot/store';
import { formatDate } from '@/lib/utils';
import { ChartContainer } from '@/components/ui/chart';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
// ProcessFlow removed temporarily
import { readinessLabel, dashboardLabels } from '@/lib/pilot/i18n';

const chartPalette = ['#2563eb', '#3b82f6', '#60a5fa', '#94a3b8', '#f59e0b'];
// stable color by key (name/id) so the same person keeps the same color across charts
const colorForKey = (key?: string | number) => {
  if (key === undefined || key === null) return chartPalette[0];
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  const idx = Math.abs(h) % chartPalette.length;
  return chartPalette[idx];
};

export default function DashboardPage() {
  const db = usePilotStore((state) => state.db);
  const { stockView } = usePilotDerived();
  const router = useRouter();

  const openOrders = db.orders.filter((item) => ['ABERTO', 'EM_PICKING'].includes(item.status)).length;
  const tasksPending = db.productionTasks.filter((item) => item.status !== 'DONE').length;
  const receiptsDraft = db.inventoryReceipts.filter((item) => item.status === 'DRAFT').length;
  const unread = db.notifications.filter((item) => !item.readAt).length;

  const lowStock = stockView.filter((item) => item.material && item.available <= item.material.minStock);
  const recentOrders = [...db.orders]
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, 6);

  const ordersBySellerMap: Record<string, number> = {};
  db.orders.forEach((o) => {
    const key = o.createdBy || 'Sem registro';
    ordersBySellerMap[key] = (ordersBySellerMap[key] || 0) + 1;
  });
  const ordersBySeller = Object.entries(ordersBySellerMap).map(([id, value]) => ({
    name: db.users.find((u) => u.id === id)?.name || id,
    value,
  }));

  const ordersByPickerMap: Record<string, number> = {};
  db.orders.forEach((o) => {
    if (!o.pickerId) return;
    ordersByPickerMap[o.pickerId] = (ordersByPickerMap[o.pickerId] || 0) + 1;
  });
  const ordersByPicker = Object.entries(ordersByPickerMap).map(([id, value]) => ({
    name: db.users.find((u) => u.id === id)?.name || id,
    value,
  }));

  const receiptsByOperatorMap: Record<string, number> = {};
  db.inventoryReceipts.forEach((r) => {
    const key = r.postedBy || 'Sem registro';
    receiptsByOperatorMap[key] = (receiptsByOperatorMap[key] || 0) + 1;
  });
  const receiptsByOperator = Object.entries(receiptsByOperatorMap).map(([name, value]) => ({ name, value }));

  // status distribution for funnel/donut
  const ordersStatusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    db.orders.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v }));
  }, [db.orders]);

  // aging distribution buckets (days)
  const agingBuckets = useMemo(() => {
    const buckets = { '0-3': 0, '4-7': 0, '8-14': 0, '15+': 0 } as Record<string, number>;
    const now = Date.now();
    db.orders.forEach((o) => {
      const days = Math.floor((now - new Date(o.orderDate).getTime()) / (24 * 3600 * 1000));
      if (days <= 3) buckets['0-3']++;
      else if (days <= 7) buckets['4-7']++;
      else if (days <= 14) buckets['8-14']++;
      else buckets['15+']++;
    });
    return Object.entries(buckets).map(([k, v]) => ({ bucket: k, value: v }));
  }, [db.orders]);

  // heatmap: picks per user per hour (0-23) using pickerId and orderDate hour
  const pickerHeat = useMemo(() => {
    const pickers = db.users.filter((u) => u.role === 'Picker');
    const result: Record<string, number[]> = {};
    pickers.forEach((p) => (result[p.id] = Array.from({ length: 24 }).map(() => 0)));
    db.orders.forEach((o) => {
      if (!o.pickerId) return;
      const hour = new Date(o.orderDate).getHours();
      if (!result[o.pickerId]) result[o.pickerId] = Array.from({ length: 24 }).map(() => 0);
      result[o.pickerId][hour]++;
    });
    return { pickers, result };
  }, [db.orders, db.users]);

  // gauge: percent of materials below minStock (risk)
  const gaugeRisk = useMemo(() => {
    const total = db.materials.length || 1;
    const low = lowStock.length;
    return Math.round((low / total) * 100);
  }, [db.materials, lowStock]);

  // scatter: order size vs lead time
  const scatterData = useMemo(() => db.orders.map((o) => {
    const size = o.items.reduce((s, it) => s + (it.qtyRequested ?? 0), 0);
    const lead = Math.max(0, Math.round((new Date(o.dueDate).getTime() - new Date(o.orderDate).getTime()) / (24 * 3600 * 1000)));
    return { size, lead };
  }), [db.orders]);

  // Fluxo por pedido: contar pedidos, pedidos totalmente separados, em produção e parados
  const totalOrders = db.orders.length;
  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = db.orders.filter((o) => o.orderDate.slice(0, 10) === today).length;

  // Helper: build daily series for the last N days (inclusive)
  const last14 = useMemo(() => {
    const arr: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      arr.push(d.toISOString().slice(0, 10));
    }
    return arr;
  }, []);

  const ordersVolumeSeries = useMemo(() => last14.map((date) => ({
    date,
    orders: db.orders.filter((o) => o.orderDate.slice(0, 10) === date).length,
  })), [db.orders, last14]);

  const fulfillmentSeries = useMemo(() => last14.map((date) => {
    const ordersOnDay = db.orders.filter((o) => o.orderDate.slice(0, 10) === date);
    const finished = ordersOnDay.filter((o) => o.status === 'FINALIZADO' || o.status === 'SAIDA_CONCLUIDA').length;
    const rate = ordersOnDay.length === 0 ? 0 : Math.round((finished / ordersOnDay.length) * 100);
    return { date, rate };
  }), [db.orders, last14]);

  const throughputSeries = useMemo(() => last14.map((date) => ({
    date,
    done: db.productionTasks.filter((t) => (t.status === 'DONE') && t.updatedAt.slice(0, 10) === date).length,
  })), [db.productionTasks, last14]);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }), []);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }), []);
  // Helper: safely parse bucket label (YYYY-MM or YYYY-MM-DD) into Date
  const parseBucketToDate = (label?: string | number) => {
    if (label === undefined || label === null) return null;
    const s = String(label);
    // YYYY-MM
    const ym = s.match(/^(\d{4})-(\d{2})$/);
    if (ym) {
      const y = Number(ym[1]);
      const m = Number(ym[2]) - 1;
      const d = new Date(y, m, 1);
      return isNaN(d.getTime()) ? null : d;
    }
    // YYYY-MM-DD
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      const y = Number(ymd[1]);
      const m = Number(ymd[2]) - 1;
      const day = Number(ymd[3]);
      const d = new Date(y, m, day);
      return isNaN(d.getTime()) ? null : d;
    }
    // fallback
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatBucketLabel = (label?: string | number) => {
    const d = parseBucketToDate(label);
    if (!d) return String(label ?? '');
    // if period aggregated by month (labels are YYYY-MM) we'll format with monthFmt elsewhere
    return dateFmt.format(d);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [search, setSearch] = useState('');
  const filteredRecentOrders = useMemo(() => {
    if (!search) return recentOrders;
    const q = search.toLowerCase();
    return recentOrders.filter((o) => (o.orderNumber || '').toLowerCase().includes(q) || (o.clientName || '').toLowerCase().includes(q));
  }, [recentOrders, search]);

  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  if (!mounted) {
    // Render a simple skeleton layout on server and before client mount
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/70 bg-muted/20 p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-9 w-36" />
              <div className="mt-3">
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const separatedSet = new Set(
    db.orders.filter((o) => o.items.every((it) => (it.qtySeparated ?? 0) >= (it.qtyRequested ?? 0))).map((o) => o.id)
  );

  const producingSet = new Set(db.productionTasks.map((t) => t.orderId));

  const blockedSet = new Set(db.productionTasks.filter((t) => t.status !== 'DONE').map((t) => t.orderId));

  const separatedOnly = Array.from(separatedSet).filter((id) => !producingSet.has(id)).length;
  const producingOnly = Array.from(producingSet).filter((id) => !separatedSet.has(id)).length;
  const bothSeparatedAndProducing = Array.from(separatedSet).filter((id) => producingSet.has(id)).length;
  const blockedCount = blockedSet.size;

  const finishedSet = new Set<string>();
  db.orders.forEach((o) => {
    const allSeparated = o.items.every((it) => (it.qtySeparated ?? 0) >= (it.qtyRequested ?? 0));
    const tasksForOrder = db.productionTasks.filter((t) => t.orderId === o.id);
    const allProdDone = tasksForOrder.length > 0 && tasksForOrder.every((t) => t.status === 'DONE');
    if (allSeparated || allProdDone) finishedSet.add(o.id);
  });
  const finishedCount = finishedSet.size;

  // Build series depending on selected period: last 14 days, specific month (days), or all (aggregated by month)
  const ordersComparisonSeries = (() => {
    let buckets: string[] = [];
    if (period === 'month') {
      // generate all days for selectedMonth (YYYY-MM)
      const [y, m] = selectedMonth.split('-').map(Number);
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      const days: string[] = [];
      for (let d = 1; d <= last.getDate(); d++) {
        const dd = new Date(y, m - 1, d).toISOString().slice(0, 10);
        days.push(dd);
      }
      buckets = days;
    } else {
      // all -> aggregate by month between earliest and latest order
      if (db.orders.length === 0) return [];
      const dates = db.orders.map((o) => new Date(o.orderDate));
      const min = new Date(Math.min(...dates.map((d) => d.getTime())));
      const max = new Date(Math.max(...dates.map((d) => d.getTime())));
      const months: string[] = [];
      const cur = new Date(min.getFullYear(), min.getMonth(), 1);
      const end = new Date(max.getFullYear(), max.getMonth(), 1);
      while (cur <= end) {
        months.push(cur.toISOString().slice(0, 7)); // YYYY-MM
        cur.setMonth(cur.getMonth() + 1);
      }
      buckets = months;
    }

    return buckets.map((bucket) => {
      let ordersOnBucket = [] as typeof db.orders;
      if (period === 'all') {
        ordersOnBucket = db.orders.filter((o) => o.orderDate.slice(0, 7) === bucket);
      } else {
        ordersOnBucket = db.orders.filter((o) => o.orderDate.slice(0, 10) === bucket);
      }

      const created = ordersOnBucket.length;
      const inSeparation = ordersOnBucket.filter((o) => {
        const totalRequested = o.items.reduce((s, it) => s + (it.qtyRequested ?? 0), 0);
        const totalSeparated = o.items.reduce((s, it) => s + (it.qtySeparated ?? 0), 0);
        return totalSeparated > 0 && !finishedSet.has(o.id);
      }).length;
      const finalized = ordersOnBucket.filter((o) => finishedSet.has(o.id)).length;
      return { date: bucket, created, inSeparation, finalized };
    });
  })();

  // Gaps: parados/pendentes em cada etapa
  const partialSeparatedSet = new Set(
    db.orders
      .filter((o) => {
        const totalRequested = o.items.reduce((s, it) => s + (it.qtyRequested ?? 0), 0);
        const totalSeparated = o.items.reduce((s, it) => s + (it.qtySeparated ?? 0), 0);
        return totalSeparated > 0 && totalSeparated < totalRequested;
      })
      .map((o) => o.id)
  );

  const partialSeparated = Array.from(partialSeparatedSet).filter((id) => !producingSet.has(id) && !finishedSet.has(id)).length;

  const stoppedInSeparation = db.orders.filter((o) => {
    const totalSeparated = o.items.reduce((s, it) => s + (it.qtySeparated ?? 0), 0);
    const hasProduction = producingSet.has(o.id);
    const isFinished = finishedSet.has(o.id);
    return totalSeparated === 0 && !hasProduction && !isFinished;
  }).length;

  const waitingProduction = separatedOnly; // fully separated but not producing
  const stoppedInProduction = blockedCount; // production tasks not done

  const ordersInSeparation = separatedOnly + partialSeparated;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Última atualização: {formatDate(new Date().toISOString())}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input aria-label="Pesquisar pedidos" placeholder="Pesquisar pedidos (número ou cliente)..." value={search} onChange={(e) => setSearch((e.target as HTMLInputElement).value)} className="max-w-xs" />
          <Button variant="secondary" onClick={() => router.refresh()} aria-label="Atualizar dashboard">
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar
          </Button>
          <Button onClick={() => router.push('/orders/new')} aria-label="Novo pedido">
            <Plus className="mr-2 h-4 w-4" />Novo pedido
          </Button>
        </div>
      </div>
      {/* router for drilldowns */}
      {/* eslint-disable-next-line react-hooks/rules-of-hooks */}
      {null}
      {/* end */}
      
      
      <div className="space-y-6">
        <section aria-labelledby="overview">
          <h3 id="overview" className="font-headline text-lg">Overview</h3>
          <p className="text-sm text-muted-foreground mt-1">Visão consolidada com KPIs principais e atalhos.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            <KpiCard title="Pedidos abertos" value={openOrders} icon={ShoppingCart} trend="+4.2% vs. ontem" onClick={() => router.push('/orders?view=open&sub=all')} />
            <KpiCard title="Pedidos em separação" value={ordersInSeparation} icon={ShoppingCart} unit="un" onClick={() => router.push('/orders?filter=in_separation')} />
            <KpiCard title="Pedidos finalizados" value={finishedCount} icon={ShieldAlert} tone="success" unit="un" onClick={() => router.push('/orders?view=finalized')} />
            <KpiCard title="Tarefas de produção" value={tasksPending} icon={Factory} trend="2 em atraso" tone="info" onClick={() => router.push('/production')} />
            <KpiCard title="Estoque crítico" value={lowStock.length} icon={ShieldAlert} tone={lowStock.length > 0 ? 'warning' : 'success'} unit="un" onClick={() => router.push('/materials?filter=lowstock')} />
            <KpiCard title="Recebimentos (rascunho)" value={receiptsDraft} icon={Package} tone="success" onClick={() => router.push('/inventory?view=draft')} />
            <KpiCard title="Alertas não lidos" value={unread} icon={AlertTriangle} tone="warning" onClick={() => router.push('/notifications')} />
            <KpiCard title="Pedidos com sep+prod" value={bothSeparatedAndProducing} icon={ShieldAlert} unit="un" onClick={() => router.push('/orders?filter=sep_and_prod')} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                  <div className="flex items-start justify-between w-full">
                    <div>
                      <CardTitle>Volume de pedidos</CardTitle>
                      <CardDescription>Comparativo: Criados / Em separação / Finalizados</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md border border-border/70 bg-muted/20 p-1">
                      <button className={`px-3 py-1 text-sm ${period === 'month' ? 'bg-muted/80 rounded' : ''}`} onClick={() => setPeriod('month')}>Mês</button>
                      <button className={`px-3 py-1 text-sm ${period === 'all' ? 'bg-muted/80 rounded' : ''}`} onClick={() => setPeriod('all')}>Tudo</button>
                    </div>
                      {period === 'month' && (
                        <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth((e.target as HTMLInputElement).value)} className="ml-2" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                {ordersComparisonSeries.every((s) => s.created === 0 && s.inSeparation === 0 && s.finalized === 0) ? (
                  <EmptyState title="Sem pedidos recentes" description="Nenhum pedido criado nos últimos dias." />
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={ordersComparisonSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(t) => {
                        const d = parseBucketToDate(t);
                        if (!d) return String(t ?? '');
                        return period === 'all' ? monthFmt.format(d) : dateFmt.format(d);
                      }} />
                      <YAxis />
                      <Tooltip labelFormatter={(label) => {
                        const d = parseBucketToDate(label);
                        if (!d) return String(label ?? '');
                        return period === 'all' ? monthFmt.format(d) : dateFmt.format(d);
                      }} />
                      <Legend />
                      <Line type="monotone" dataKey="created" name="Criados" stroke="#2563eb" dot={false} />
                      <Line type="monotone" dataKey="inSeparation" name="Em separação" stroke="#f59e0b" dot={false} />
                      <Line type="monotone" dataKey="finalized" name="Finalizados" stroke="#10b981" dot={false} />
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
                {fulfillmentSeries.every((s) => s.rate === 0) ? (
                  <EmptyState title="Sem dados de finalização" description="Nenhum pedido finalizado nos últimos dias." />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={fulfillmentSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(t) => dateFmt.format(new Date(t))} />
                      <YAxis unit="%" />
                      <Tooltip labelFormatter={(label) => dateFmt.format(new Date(String(label)))} />
                      <Line type="monotone" dataKey="rate" stroke="#10b981" />
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
                    description="Novos pedidos aparecerao aqui assim que forem registrados."
                  />
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {filteredRecentOrders.map((order) => (
                      <div
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-xl border border-border/70 bg-muted/20 p-4 transition"
                      >
                        <div>
                          <p className="font-medium text-foreground">{order.orderNumber} - {order.clientName}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(order.orderDate)} - {order.items.length} itens</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{order.status}</Badge>
                          <Badge variant={order.readiness === 'READY_FULL' ? 'positive' : order.readiness === 'READY_PARTIAL' ? 'warning' : 'outline'}>
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
                    title="Sem materiais criticos"
                    description="Todos os itens estao dentro do nivel minimo configurado."
                  />
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-3">
                    {lowStock.map((entry) => (
                      <div key={entry.materialId} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{entry.material?.name}</p>
                          <Badge variant={entry.available <= 0 ? 'destructive' : 'warning'}>{entry.available}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Em estoque {entry.onHand} - Reservado {entry.reservedTotal} - Minimo {entry.material?.minStock}
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

      {/* (Duplicated charts removed) */}

      {/* Additional visualizations: status donut, aging histogram, heatmap, gauge, scatter */}
      <div className="grid gap-6 lg:grid-cols-3">
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
                <PieChart>
                  <Pie data={ordersStatusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                    {ordersStatusCounts.map((_, i) => (
                      <Cell key={`st-${i}`} fill={chartPalette[i % chartPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
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
            {agingBuckets.every((b) => b.value === 0) ? (
              <EmptyState title="Sem dados" description="Nenhum pedido." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={agingBuckets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
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
                <PieChart>
                  <Pie data={[{ name: 'risk', value: gaugeRisk }, { name: 'ok', value: 100 - gaugeRisk }]} dataKey="value" startAngle={180} endAngle={0} innerRadius={40} outerRadius={80} paddingAngle={2}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center mt-2 font-semibold">{gaugeRisk}% em risco</p>
          </CardContent>
        </Card>

        {/* Gráfico 'Order size vs Lead time' removido conforme solicitado */}
      </div>

      

      <div className="grid gap-6 md:grid-cols-3">
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
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={ordersBySeller} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                              {ordersBySeller.map((entry) => (
                                <Cell key={`seller-${entry.name}`} fill={colorForKey(entry.name)} />
                              ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
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
                <EmptyState icon={ShoppingCart} title="Sem dados" description="Nenhuma separacao registrada." />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={ordersByPicker} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                      {ordersByPicker.map((entry) => (
                        <Cell key={`picker-${entry.name}`} fill={colorForKey(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dashboardLabels.operatorsTitle}</CardTitle>
            <CardDescription>{dashboardLabels.operatorsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ operators: { label: 'Operadores' } }}>
              {receiptsByOperator.length === 0 ? (
                <EmptyState icon={Package} title="Sem dados" description="Nenhum registro de entrada." />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={receiptsByOperator} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                      {receiptsByOperator.map((entry) => (
                        <Cell key={`operator-${entry.name}`} fill={colorForKey(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
