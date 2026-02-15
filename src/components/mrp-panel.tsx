import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePilotDerived, usePilotStore } from '@/lib/pilot/store';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

type InventoryReceipt = { postedAt?: string; items?: { materialId?: string; qty?: number }[] };
type ProductionTask = {
  materialId?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
  qtyToProduce?: number;
};
type OrderItem = { materialId?: string; qtyRequested?: number };
type OrderType = { status?: string; orderDate?: string; createdAt?: string; items?: OrderItem[] };
type Db = { inventoryReceipts?: InventoryReceipt[]; productionTasks?: ProductionTask[]; orders?: OrderType[] };

function buildSeries(db: Db, materialId: string) {
  const days = 30;
  const today = new Date();
  const map: Record<string, { date: string; entries: number; production: number; outputs: number }> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = { date: key, entries: 0, production: 0, outputs: 0 };
  }

  // inventory receipts -> entries
  (db.inventoryReceipts || []).forEach((r) => {
    const posted = r.postedAt;
    if (!posted) return;
    const dateKey = new Date(posted).toISOString().slice(0, 10);
    if (!map[dateKey]) return;
    (r.items || []).forEach((it) => {
      if (it.materialId === materialId) map[dateKey].entries += it.qty || 0;
    });
  });

  // production tasks -> production when done
  (db.productionTasks || []).forEach((t) => {
    if (t.materialId !== materialId) return;
    if (t.status !== 'DONE') return;
    const ts = t.updatedAt ?? t.createdAt;
    if (!ts) return;
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    if (!map[dateKey]) return;
    map[dateKey].production += t.qtyToProduce || 0;
  });

  // orders -> outputs when shipped/finished
  (db.orders || []).forEach((o) => {
    if (!['SAIDA_CONCLUIDA', 'FINALIZADO'].includes(o.status || '')) return;
    const ts = o.orderDate ?? o.createdAt;
    if (!ts) return;
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    if (!map[dateKey]) return;
    (o.items || []).forEach((it) => {
      if (it.materialId === materialId) map[dateKey].outputs += it.qtyRequested || 0;
    });
  });

  return Object.values(map);
}

export default function MrpPanel() {
  const { stockView } = usePilotDerived();
  const db = usePilotStore((s) => s.db);

  const [expandedMaterialId, setExpandedMaterialId] = React.useState<string | null>(null);

  function toggleExpand(materialId: string) {
    setExpandedMaterialId((cur) => (cur === materialId ? null : materialId));
  }

  // Simple heuristic: list materials below reorder point
  const suggestions = stockView
    .map((s) => ({ ...s, material: db.materials.find((m) => m.id === s.materialId) }))
    .filter((s) => s.material && s.available <= (s.material?.reorderPoint ?? 0));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>MRP - Sugestões</CardTitle>
          <CardDescription>Itens abaixo do ponto de pedido / necessidades calculadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Disponivel</TableHead>
                <TableHead className="text-right">Ponto pedido</TableHead>
                <TableHead className="text-right">Sugestão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="border-none py-8 text-center text-sm text-muted-foreground">
                    Nenhuma sugestão no momento.
                  </TableCell>
                </TableRow>
              ) : (
                suggestions.map((s) => (
                  <React.Fragment key={s.materialId}>
                    <TableRow>
                      <TableCell>{s.material?.name ?? s.materialId}</TableCell>
                      <TableCell className="text-right">{s.available}</TableCell>
                      <TableCell className="text-right">{s.material?.reorderPoint}</TableCell>
                      <TableCell className="text-right">{Math.max((s.material?.reorderPoint ?? 0) - s.available, 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => toggleExpand(s.materialId)}>
                          {expandedMaterialId === s.materialId ? 'Fechar' : 'Ver'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedMaterialId === s.materialId && (
                      <TableRow key={`${s.materialId}-expanded`}>
                        <TableCell colSpan={5} className="border-none p-4">
                          <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                            <div className="font-medium mb-2">{s.material?.name}</div>
                            <div className="h-56">
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={buildSeries(db, s.materialId)}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" tickFormatter={(t: string) => t} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="entries" name="Entradas" stroke="#2563eb" dot={false} />
                                  <Line type="monotone" dataKey="production" name="Produção" stroke="#f59e0b" dot={false} />
                                  <Line type="monotone" dataKey="outputs" name="Saídas" stroke="#10b981" dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      
    </>
  );
}
