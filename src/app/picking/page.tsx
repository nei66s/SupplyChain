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
import { generateLabelPdf } from '@/lib/pilot/labels';
import { readinessLabel, readinessTabLabel } from '@/lib/pilot/i18n';
import { usePilotStore } from '@/lib/pilot/store';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

export default function PickingPage() {
  const db = usePilotStore((state) => state.db);
  const updateSeparatedQty = usePilotStore((state) => state.updateSeparatedQty);
  const concludePicking = usePilotStore((state) => state.concludePicking);
  const registerLabelPrint = usePilotStore((state) => state.registerLabelPrint);

  const [filter, setFilter] = React.useState<'READY_FULL' | 'READY_PARTIAL' | 'ALL'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  const queue = db.orders
    .filter((order) => ['EM_PICKING', 'ABERTO', 'SAIDA_CONCLUIDA'].includes(order.status))
    .filter((order) => (filter === 'ALL' ? true : order.readiness === filter));

  const selected = queue.find((order) => order.id === selectedOrderId) ?? queue[0] ?? null;

  React.useEffect(() => {
    if (!selectedOrderId && queue[0]) {
      setSelectedOrderId(queue[0].id);
    }
  }, [queue, selectedOrderId]);

  const handlePrintLabels = async () => {
    if (!selected) return;
    const pickerName = db.users.find((item) => item.id === selected.pickerId)?.name;
    await generateLabelPdf(selected, pickerName);
    registerLabelPrint(selected.id);
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
                  <Button variant="outline" onClick={handlePrintLabels}><FileText className="mr-2 h-4 w-4" />Imprimir etiquetas</Button>
                  <Button onClick={() => concludePicking(selected.id)}>Concluir picking</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qtd. solicitada</TableHead>
                    <TableHead className="text-right">Qtd. reservada</TableHead>
                    <TableHead className="text-right">Qtd. separada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">{item.uom} - {item.color}</p>
                      </TableCell>
                      <TableCell className="text-right">{item.qtyRequested}</TableCell>
                      <TableCell className="text-right">{item.qtyReservedFromStock}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={item.qtyReservedFromStock}
                          className="ml-auto w-28 text-right"
                          value={item.qtySeparated}
                          onChange={(e) => updateSeparatedQty(selected.id, item.id, Number(e.target.value))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
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
