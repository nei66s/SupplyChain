'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Material, Order } from '@/lib/domain/types';

type ReportRow = {
  key: string;
  pacote: string;
  operador: string;
  codigo: string;
  produto: string;
  descricao: string;
  pedido: string;
  valor: string;
  data: string;
  rawDate: string;
};

function usesMeasuredUom(uom?: string | null) {
  const normalized = String(uom ?? '').trim().toUpperCase();
  return normalized === 'KG' || normalized === 'M';
}

export default function ReportPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [search, setSearch] = React.useState('');
  const [operatorFilter, setOperatorFilter] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [visibleCountInput, setVisibleCountInput] = React.useState('50');

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
      } catch (err) {
        console.error('report load failed', err);
      }
    })();
  }, []);

  const rows = React.useMemo<ReportRow[]>(() => {
    const filtered = orders.filter((order) => ['SAIDA_CONCLUIDA', 'FINALIZADO'].includes(order.status));
    const mapped: ReportRow[] = [];

    filtered.forEach((order) => {
      const operator =
        order.auditTrail.find((entry) => entry.action === 'PICKING_COMPLETED')?.actor ??
        order.auditTrail[0]?.actor ??
        '---';
      const rawDate = (order.dueDate || order.orderDate || '').slice(0, 10);

      order.items.forEach((item) => {
        const material = materials.find((mat) => mat.id === item.materialId);
        const metadata = material?.metadata ?? {};
        const codigo = (metadata as any)['Codigo'] || (material as any)?.sku || '-';
        const descricao = material?.description || (metadata as any)['Tipos'] || (metadata as any)['Produto'] || '-';
        const requestedValue = Number(item.qtyRequested ?? item.requestedWeight ?? 0);
        const separatedValue = Number(item.qtySeparated ?? item.separatedWeight ?? 0);
        const valorBase = usesMeasuredUom(item.uom)
          ? Math.max(separatedValue, requestedValue)
          : Math.max(separatedValue, requestedValue);
        const valor = `${valorBase} ${item.uom}`;

        mapped.push({
          key: `${order.id}-${item.id}`,
          pacote: order.orderNumber,
          operador: operator,
          codigo,
          produto: item.materialName,
          descricao,
          pedido: order.clientName || order.orderNumber,
          valor,
          data: formatDate(rawDate || order.orderDate),
          rawDate,
        });
      });
    });

    return mapped;
  }, [orders, materials]);

  const operatorOptions = React.useMemo(
    () => [...new Set(rows.map((row) => row.operador).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows]
  );

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [row.pacote, row.operador, row.codigo, row.produto, row.descricao, row.pedido]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesOperator = operatorFilter === 'all' || row.operador === operatorFilter;
      const matchesDateFrom = !dateFrom || (row.rawDate && row.rawDate >= dateFrom);
      const matchesDateTo = !dateTo || (row.rawDate && row.rawDate <= dateTo);

      return matchesSearch && matchesOperator && matchesDateFrom && matchesDateTo;
    });
  }, [rows, search, operatorFilter, dateFrom, dateTo]);

  const visibleCount = React.useMemo(() => {
    const parsed = Number.parseInt(visibleCountInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 50;
    return Math.min(parsed, 5000);
  }, [visibleCountInput]);

  const visibleRows = React.useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  const clearFilters = React.useCallback(() => {
    setSearch('');
    setOperatorFilter('all');
    setDateFrom('');
    setDateTo('');
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="font-headline">Relatorio</CardTitle>
            <CardDescription>Registro das saidas concluidas, inspirado na planilha antiga.</CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/report/analise">Ver analise consolidada</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_160px_160px_140px_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por pacote, operador, codigo, produto ou pedido"
          />
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os operadores</SelectItem>
              {operatorOptions.map((operator) => (
                <SelectItem key={operator} value={operator}>
                  {operator}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <Input
            type="number"
            min="1"
            max="5000"
            value={visibleCountInput}
            onChange={(event) => setVisibleCountInput(event.target.value)}
            placeholder="Qtd."
          />
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-border/70 px-4 py-2 text-sm font-medium transition hover:bg-muted/40"
          >
            Limpar
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Mostrando {visibleRows.length} de {filteredRows.length} linhas filtradas
          </span>
          {(search || operatorFilter !== 'all' || dateFrom || dateTo) && (
            <span>Filtros ativos aplicados ao relatório.</span>
          )}
        </div>

        {/* Desktop Report Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pacote</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Codigo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Valor/UM</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="border-none">
                    <EmptyState title="Nenhum resultado" description="Ajuste os filtros ou complete alguns picks para gerar linhas no relatório." className="min-h-[180px]" />
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.pacote}</TableCell>
                    <TableCell>{row.operador}</TableCell>
                    <TableCell>{row.codigo}</TableCell>
                    <TableCell>{row.produto}</TableCell>
                    <TableCell>{row.descricao}</TableCell>
                    <TableCell>{row.pedido}</TableCell>
                    <TableCell>{row.valor}</TableCell>
                    <TableCell>{row.data}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Report Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
           {visibleRows.length === 0 ? (
             <EmptyState title="Relatório Vazio" description="Pedidos finalizados aparecerão aqui" className="min-h-[140px]" />
           ) : (
             visibleRows.map((row) => (
               <div key={row.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/5 p-4 shadow-sm">
                 <div className="flex items-center justify-between">
                   <p className="font-black text-slate-900 dark:text-slate-100">{row.pacote}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">{row.data}</p>
                 </div>

                 <div>
                   <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{row.pedido}</p>
                   <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{row.produto}</p>
                   <p className="text-[10px] text-slate-500 italic mt-0.5">{row.descricao}</p>
                 </div>

                 <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Separador</span>
                      <span className="text-xs font-semibold">{row.operador}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Quantidade</span>
                      <Badge variant="secondary" className="font-bold">{row.valor}</Badge>
                    </div>
                 </div>
               </div>
             ))
           )}
        </div>
      </CardContent>
    </Card>
  );
}
