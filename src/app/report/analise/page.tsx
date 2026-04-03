'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Material, Order } from '@/lib/domain/types';

const FINAL_STATUSES = new Set(['FINALIZADO', 'SAIDA_CONCLUIDA']);

type VariantAggregate = {
  key: string;
  description: string;
  color: string;
  uom: string;
  totalValue: number;
  occurrences: number;
};

type MaterialAggregate = {
  key: string;
  materialName: string;
  orderCount: number;
  itemCount: number;
  descriptionCount: number;
  colorCount: number;
  totalValue: number;
  totalsByUom: Record<string, number>;
  variants: VariantAggregate[];
};

type UomTotals = {
  KG: number;
  M: number;
  PC: number;
  OTHER: number;
};

type DashboardIndicators = {
  totalOrders: number;
  totalItems: number;
  totalMaterials: number;
  totalValue: number;
  avgItemsPerOrder: number;
  avgValuePerOrder: number;
  divergentItems: number;
  divergenceRate: number;
  fillRate: number;
};

type AbcRow = {
  materialName: string;
  totalValue: number;
  sharePercent: number;
  cumulativePercent: number;
  curveClass: 'A' | 'B' | 'C';
};

type OperatorRow = {
  operator: string;
  orderCount: number;
  itemCount: number;
  totalValue: number;
  divergenceRate: number;
};

type ClientRow = {
  clientName: string;
  orderCount: number;
  totalValue: number;
  avgOrderValue: number;
};

type AnalysisModel = {
  rows: MaterialAggregate[];
  totals: UomTotals;
  indicators: DashboardIndicators;
  abcRows: AbcRow[];
  operatorRows: OperatorRow[];
  clientRows: ClientRow[];
};

type ChartDatum = {
  label: string;
  value: number;
  note?: string;
};

function normalizeKey(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeUom(value?: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return 'PC';
  if (normalized === 'PCA' || normalized === 'PCE' || normalized === 'PCA.') return 'PC';
  return normalized;
}

function toCanonicalValue(item: Order['items'][number]) {
  const requestedValue = Number(item.qtyRequested ?? item.requestedWeight ?? 0);
  const separatedValue = Number(item.qtySeparated ?? item.separatedWeight ?? 0);
  return Math.max(requestedValue, separatedValue);
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function formatPercent(value: number) {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function shortenLabel(label: string, maxLength = 24) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}...`;
}

function pickOperator(order: Order) {
  return (
    order.auditTrail.find((entry) => entry.action === 'PICKING_COMPLETED')?.actor ??
    order.auditTrail[0]?.actor ??
    '---'
  );
}

function safeDivide(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 0;
  return a / b;
}

function resolveCurveClass(cumulativePercent: number): 'A' | 'B' | 'C' {
  if (cumulativePercent <= 80) return 'A';
  if (cumulativePercent <= 95) return 'B';
  return 'C';
}

function HorizontalBars({
  data,
  colorClassName,
  emptyTitle,
  emptyDescription,
  formatValue,
}: {
  data: ChartDatum[];
  colorClassName: string;
  emptyTitle: string;
  emptyDescription: string;
  formatValue: (value: number) => string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className="min-h-[160px]"
      />
    );
  }

  const maxValue = Math.max(...data.map((entry) => entry.value), 0);

  return (
    <div className="space-y-3">
      {data.map((entry) => {
        const widthPercent = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;
        const clampedWidth = entry.value > 0 ? Math.max(6, widthPercent) : 0;

        return (
          <div key={entry.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="truncate font-medium" title={entry.label}>
                {shortenLabel(entry.label)}
              </p>
              <p className="shrink-0 text-muted-foreground">{formatValue(entry.value)}</p>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${colorClassName}`}
                style={{ width: `${clampedWidth}%` }}
              />
            </div>
            {entry.note ? <p className="text-xs text-muted-foreground">{entry.note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function buildAnalysisModel(orders: Order[], materials: Material[]): AnalysisModel {
  const materialById = new Map<string, Material>();
  materials.forEach((material) => materialById.set(material.id, material));

  const relevantOrders = orders.filter((order) => FINAL_STATUSES.has(order.status));

  const map = new Map<string, {
    materialName: string;
    orderIds: Set<string>;
    itemCount: number;
    totalValue: number;
    totalsByUom: Record<string, number>;
    descriptions: Set<string>;
    colors: Set<string>;
    variants: Map<string, VariantAggregate>;
  }>();

  const operatorMap = new Map<string, {
    orderIds: Set<string>;
    itemCount: number;
    totalValue: number;
    divergentItems: number;
  }>();

  const clientMap = new Map<string, {
    orderCount: number;
    totalValue: number;
  }>();

  let totalItems = 0;
  let totalValue = 0;
  let requestedTotal = 0;
  let separatedTotal = 0;
  let divergentItems = 0;

  for (const order of relevantOrders) {
    const operator = pickOperator(order);
    if (!operatorMap.has(operator)) {
      operatorMap.set(operator, {
        orderIds: new Set<string>(),
        itemCount: 0,
        totalValue: 0,
        divergentItems: 0,
      });
    }
    operatorMap.get(operator)!.orderIds.add(order.id);

    const clientName = String(order.clientName ?? '').trim() || 'Sem cliente';
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, { orderCount: 0, totalValue: 0 });
    }
    clientMap.get(clientName)!.orderCount += 1;

    let orderValue = 0;

    for (const item of order.items) {
      const value = toCanonicalValue(item);
      if (!Number.isFinite(value) || value <= 0) continue;

      totalItems += 1;
      totalValue += value;
      orderValue += value;

      const requested = Number(item.qtyRequested ?? item.requestedWeight ?? 0);
      const separated = Number(item.qtySeparated ?? item.separatedWeight ?? 0);
      requestedTotal += Math.max(0, requested);
      separatedTotal += Math.max(0, separated);

      if (Math.abs(requested - separated) > 0.0001) {
        divergentItems += 1;
        operatorMap.get(operator)!.divergentItems += 1;
      }

      operatorMap.get(operator)!.itemCount += 1;
      operatorMap.get(operator)!.totalValue += value;

      const materialName = String(item.materialName ?? '').trim() || 'Material sem nome';
      const materialKey = normalizeKey(materialName);
      const uom = normalizeUom(item.uom);
      const material = materialById.get(item.materialId);
      const metadata = material?.metadata as Record<string, string> | undefined;

      const description =
        String(item.description ?? '').trim() ||
        String(material?.description ?? '').trim() ||
        String(metadata?.Tipos ?? metadata?.Produto ?? '').trim() ||
        'Sem descricao';
      const color = String(item.color ?? '').trim() || 'Sem cor';

      if (!map.has(materialKey)) {
        map.set(materialKey, {
          materialName,
          orderIds: new Set<string>(),
          itemCount: 0,
          totalValue: 0,
          totalsByUom: {},
          descriptions: new Set<string>(),
          colors: new Set<string>(),
          variants: new Map<string, VariantAggregate>(),
        });
      }

      const aggregate = map.get(materialKey)!;
      aggregate.orderIds.add(order.id);
      aggregate.itemCount += 1;
      aggregate.totalValue += value;
      aggregate.totalsByUom[uom] = Number(aggregate.totalsByUom[uom] ?? 0) + value;
      aggregate.descriptions.add(description);
      aggregate.colors.add(color);

      const variantKey = `${normalizeKey(description)}|${normalizeKey(color)}|${uom}`;
      const currentVariant = aggregate.variants.get(variantKey);
      if (currentVariant) {
        currentVariant.totalValue += value;
        currentVariant.occurrences += 1;
      } else {
        aggregate.variants.set(variantKey, {
          key: variantKey,
          description,
          color,
          uom,
          totalValue: value,
          occurrences: 1,
        });
      }
    }

    clientMap.get(clientName)!.totalValue += orderValue;
  }

  const rows: MaterialAggregate[] = Array.from(map.entries())
    .map(([key, aggregate]) => ({
      key,
      materialName: aggregate.materialName,
      orderCount: aggregate.orderIds.size,
      itemCount: aggregate.itemCount,
      descriptionCount: aggregate.descriptions.size,
      colorCount: aggregate.colors.size,
      totalValue: aggregate.totalValue,
      totalsByUom: aggregate.totalsByUom,
      variants: Array.from(aggregate.variants.values()).sort(
        (a, b) => b.totalValue - a.totalValue
      ),
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const totals: UomTotals = { KG: 0, M: 0, PC: 0, OTHER: 0 };
  rows.forEach((row) => {
    Object.entries(row.totalsByUom).forEach(([uom, value]) => {
      if (uom === 'KG') totals.KG += value;
      else if (uom === 'M') totals.M += value;
      else if (uom === 'PC') totals.PC += value;
      else totals.OTHER += value;
    });
  });

  const indicators: DashboardIndicators = {
    totalOrders: relevantOrders.length,
    totalItems,
    totalMaterials: rows.length,
    totalValue,
    avgItemsPerOrder: safeDivide(totalItems, relevantOrders.length),
    avgValuePerOrder: safeDivide(totalValue, relevantOrders.length),
    divergentItems,
    divergenceRate: safeDivide(divergentItems * 100, totalItems),
    fillRate: safeDivide(separatedTotal * 100, requestedTotal),
  };

  let cumulative = 0;
  const abcRows: AbcRow[] = rows.map((row) => {
    const sharePercent = safeDivide(row.totalValue * 100, indicators.totalValue);
    cumulative += sharePercent;
    const cumulativePercent = Math.min(100, cumulative);
    return {
      materialName: row.materialName,
      totalValue: row.totalValue,
      sharePercent,
      cumulativePercent,
      curveClass: resolveCurveClass(cumulativePercent),
    };
  });

  const operatorRows: OperatorRow[] = Array.from(operatorMap.entries())
    .map(([operator, data]) => ({
      operator,
      orderCount: data.orderIds.size,
      itemCount: data.itemCount,
      totalValue: data.totalValue,
      divergenceRate: safeDivide(data.divergentItems * 100, data.itemCount),
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const clientRows: ClientRow[] = Array.from(clientMap.entries())
    .map(([clientName, data]) => ({
      clientName,
      orderCount: data.orderCount,
      totalValue: data.totalValue,
      avgOrderValue: safeDivide(data.totalValue, data.orderCount),
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  return { rows, totals, indicators, abcRows, operatorRows, clientRows };
}

export default function ReportAnalysisPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [search, setSearch] = React.useState('');
  const [uomFilter, setUomFilter] = React.useState('ALL');
  const [selectedMaterialKey, setSelectedMaterialKey] = React.useState<string>('ALL');

  React.useEffect(() => {
    (async () => {
      try {
        const [ordersRes, materialsRes] = await Promise.all([
          fetch('/api/orders', { cache: 'no-store' }),
          fetch('/api/materials', { cache: 'no-store' }),
        ]);

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(Array.isArray(data) ? data : []);
        }
        if (materialsRes.ok) {
          const data = await materialsRes.json();
          setMaterials(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('analysis load failed', error);
      }
    })();
  }, []);

  const { rows, totals, indicators, abcRows, operatorRows, clientRows } = React.useMemo(
    () => buildAnalysisModel(orders, materials),
    [orders, materials]
  );

  const abcChartData = React.useMemo<ChartDatum[]>(
    () =>
      abcRows.slice(0, 8).map((row) => ({
        label: row.materialName,
        value: row.totalValue,
        note: `${formatPercent(row.sharePercent)} | Classe ${row.curveClass}`,
      })),
    [abcRows]
  );

  const operatorChartData = React.useMemo<ChartDatum[]>(
    () =>
      operatorRows.slice(0, 8).map((row) => ({
        label: row.operator,
        value: row.totalValue,
        note: `${row.orderCount} pedidos | Divergencia ${formatPercent(row.divergenceRate)}`,
      })),
    [operatorRows]
  );

  const clientChartData = React.useMemo<ChartDatum[]>(
    () =>
      clientRows.slice(0, 8).map((row) => ({
        label: row.clientName,
        value: row.totalValue,
        note: `${row.orderCount} pedidos | Media ${formatNumber(row.avgOrderValue)}`,
      })),
    [clientRows]
  );

  const uomChartData = React.useMemo<ChartDatum[]>(
    () => [
      { label: 'KG', value: totals.KG },
      { label: 'M', value: totals.M },
      { label: 'PC', value: totals.PC },
      { label: 'OUTRAS', value: totals.OTHER },
    ],
    [totals]
  );

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = normalizeKey(search);
    return rows.filter((row) => {
      const matchesSearch =
        normalizedSearch.length === 0 || normalizeKey(row.materialName).includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (uomFilter === 'ALL') return true;
      return Number(row.totalsByUom[uomFilter] ?? 0) > 0;
    });
  }, [rows, search, uomFilter]);

  React.useEffect(() => {
    if (selectedMaterialKey === 'ALL') return;
    if (!filteredRows.some((row) => row.key === selectedMaterialKey)) {
      setSelectedMaterialKey('ALL');
    }
  }, [filteredRows, selectedMaterialKey]);

  const selectedMaterial = React.useMemo(() => {
    if (selectedMaterialKey === 'ALL') return filteredRows[0] ?? null;
    return filteredRows.find((row) => row.key === selectedMaterialKey) ?? null;
  }, [filteredRows, selectedMaterialKey]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Analise do relatorio</CardTitle>
          <CardDescription>
            Painel consolidado com os indicadores possiveis a partir das informacoes atuais de pedidos finalizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Pedidos finalizados</p>
              <p className="text-xl font-semibold">{indicators.totalOrders}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Itens analisados</p>
              <p className="text-xl font-semibold">{indicators.totalItems}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Materiais base</p>
              <p className="text-xl font-semibold">{indicators.totalMaterials}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Valor medio por pedido</p>
              <p className="text-xl font-semibold">{formatNumber(indicators.avgValuePerOrder)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Divergencia item x separado</p>
              <p className="text-xl font-semibold">{formatPercent(indicators.divergenceRate)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Fill rate separado</p>
              <p className="text-xl font-semibold">{formatPercent(indicators.fillRate)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Total KG</p>
              <p className="text-xl font-semibold">{formatNumber(totals.KG)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Total M</p>
              <p className="text-xl font-semibold">{formatNumber(totals.M)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Total PC</p>
              <p className="text-xl font-semibold">{formatNumber(totals.PC)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Outras unidades</p>
              <p className="text-xl font-semibold">{formatNumber(totals.OTHER)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Itens divergentes</p>
              <p className="text-xl font-semibold">{indicators.divergentItems}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Itens medios/pedido</p>
              <p className="text-xl font-semibold">{formatNumber(indicators.avgItemsPerOrder)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Grafico ABC (Top materiais)</CardTitle>
            <CardDescription>
              Volume dos principais materiais com classe da curva ABC.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={abcChartData}
              colorClassName="bg-emerald-500"
              formatValue={formatNumber}
              emptyTitle="Sem dados para grafico ABC"
              emptyDescription="Finalize pedidos para gerar o grafico de materiais."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Grafico por unidade (UM)</CardTitle>
            <CardDescription>
              Comparativo visual do volume acumulado por unidade de medida.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={uomChartData}
              colorClassName="bg-sky-500"
              formatValue={formatNumber}
              emptyTitle="Sem dados de unidade"
              emptyDescription="Nao foi possivel montar o grafico por unidade."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Grafico de operadores</CardTitle>
            <CardDescription>
              Top operadores por volume processado, com taxa de divergencia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={operatorChartData}
              colorClassName="bg-amber-500"
              formatValue={formatNumber}
              emptyTitle="Sem dados de operadores"
              emptyDescription="Sem auditoria suficiente para montar o grafico."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Grafico de clientes</CardTitle>
            <CardDescription>
              Top clientes por volume total nos pedidos finalizados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={clientChartData}
              colorClassName="bg-fuchsia-500"
              formatValue={formatNumber}
              emptyTitle="Sem dados de clientes"
              emptyDescription="Finalize pedidos para montar o ranking visual de clientes."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Curva ABC de materiais</CardTitle>
            <CardDescription>
              Classificacao por participacao acumulada no volume total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Participacao</TableHead>
                    <TableHead className="text-right">Acumulado</TableHead>
                    <TableHead className="text-right">Classe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abcRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="border-none">
                        <EmptyState
                          title="Sem dados para curva ABC"
                          description="Finalize pedidos para gerar classificacao."
                          className="min-h-[140px]"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    abcRows.slice(0, 12).map((row) => (
                      <TableRow key={`${row.materialName}-${row.cumulativePercent}`}>
                        <TableCell>{row.materialName}</TableCell>
                        <TableCell className="text-right">{formatPercent(row.sharePercent)}</TableCell>
                        <TableCell className="text-right">{formatPercent(row.cumulativePercent)}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              row.curveClass === 'A'
                                ? 'default'
                                : row.curveClass === 'B'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {row.curveClass}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Operadores</CardTitle>
            <CardDescription>
              Volume processado e taxa de divergencia por operador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Divergencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operatorRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="border-none">
                        <EmptyState
                          title="Sem dados de operadores"
                          description="Os operadores aparecem quando ha auditoria no pedido."
                          className="min-h-[140px]"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    operatorRows.slice(0, 12).map((row) => (
                      <TableRow key={row.operator}>
                        <TableCell>{row.operator}</TableCell>
                        <TableCell className="text-right">{row.orderCount}</TableCell>
                        <TableCell className="text-right">{row.itemCount}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.totalValue)}</TableCell>
                        <TableCell className="text-right">{formatPercent(row.divergenceRate)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Clientes</CardTitle>
          <CardDescription>
            Ranking de clientes por volume, com media por pedido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Volume total</TableHead>
                  <TableHead className="text-right">Media por pedido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="border-none">
                      <EmptyState
                        title="Sem dados de clientes"
                        description="Nenhum pedido finalizado encontrado para analise."
                        className="min-h-[140px]"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  clientRows.slice(0, 12).map((row) => (
                    <TableRow key={row.clientName}>
                      <TableCell>{row.clientName}</TableCell>
                      <TableCell className="text-right">{row.orderCount}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.totalValue)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.avgOrderValue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Consolidado por material base</CardTitle>
          <CardDescription>
            Visao principal para materiais repetidos, separando por unidade e volume acumulado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_220px]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar material base"
            />
            <Select value={uomFilter} onValueChange={setUomFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas unidades</SelectItem>
                <SelectItem value="KG">KG</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="PC">PC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material base</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Variacoes</TableHead>
                  <TableHead className="text-right">KG</TableHead>
                  <TableHead className="text-right">M</TableHead>
                  <TableHead className="text-right">PC</TableHead>
                  <TableHead className="text-right">Total geral</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="border-none">
                      <EmptyState
                        title="Sem dados consolidados"
                        description="Finalize pedidos no relatorio para gerar a analise de variacoes."
                        className="min-h-[160px]"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setSelectedMaterialKey(row.key)}
                          className="text-left hover:underline"
                        >
                          {row.materialName}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">{row.itemCount}</TableCell>
                      <TableCell className="text-right">{row.orderCount}</TableCell>
                      <TableCell className="text-right">{row.variants.length}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(row.totalsByUom.KG ?? 0))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(row.totalsByUom.M ?? 0))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(row.totalsByUom.PC ?? 0))}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(row.totalValue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-headline">Variacoes do material</CardTitle>
              <CardDescription>
                Quebra por descricao + cor + unidade para enxergar materiais iguais com variaveis diferentes.
              </CardDescription>
            </div>
            <div className="w-full md:w-[320px]">
              <Select value={selectedMaterialKey} onValueChange={setSelectedMaterialKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Primeiro material do filtro</SelectItem>
                  {filteredRows.map((row) => (
                    <SelectItem key={row.key} value={row.key}>
                      {row.materialName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedMaterial ? (
            <EmptyState
              title="Nenhum material selecionado"
              description="Ajuste os filtros para visualizar as variacoes."
              className="min-h-[140px]"
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedMaterial.materialName}</Badge>
                <Badge variant="secondary">{selectedMaterial.variants.length} variacoes</Badge>
                <Badge variant="outline">Descricoes: {selectedMaterial.descriptionCount}</Badge>
                <Badge variant="outline">Cores: {selectedMaterial.colorCount}</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>UM</TableHead>
                      <TableHead className="text-right">Ocorrencias</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMaterial.variants.map((variant) => (
                      <TableRow key={variant.key}>
                        <TableCell>{variant.description}</TableCell>
                        <TableCell>{variant.color}</TableCell>
                        <TableCell>{variant.uom}</TableCell>
                        <TableCell className="text-right">{variant.occurrences}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(variant.totalValue)} {variant.uom}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
