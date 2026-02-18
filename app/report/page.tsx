'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
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
  peso: string;
  data: string;
};

export default function ReportPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);

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
      const dateLabel = order.dueDate || order.orderDate;

      order.items.forEach((item) => {
        const material = materials.find((mat) => mat.id === item.materialId);
        const metadata = material?.metadata ?? {};
        const codigo = (metadata as any)['Codigo'] || (material as any)?.sku || '-';
        const descricao = material?.description || (metadata as any)['Tipos'] || (metadata as any)['Produto'] || '-';
        const pesoValue = Math.max(item.qtySeparated, item.qtyRequested);
        const peso = `${pesoValue} ${item.uom}`;

        mapped.push({
          key: `${order.id}-${item.id}`,
          pacote: order.orderNumber,
          operador: operator,
          codigo,
          produto: item.materialName,
          descricao,
          pedido: order.clientName || order.orderNumber,
          peso,
          data: formatDate(dateLabel),
        });
      });
    });

    return mapped;
  }, [orders, materials]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="font-headline">Relatorio</CardTitle>
          <CardDescription>Registro das saidas concluidas, inspirado na planilha antiga.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pacote</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Peso/metros</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="border-none">
                  <EmptyState title="Relatorio vazio" description="Complete alguns picks para gerar as linhas do relatorio." className="min-h-[180px]" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.pacote}</TableCell>
                  <TableCell>{row.operador}</TableCell>
                  <TableCell>{row.codigo}</TableCell>
                  <TableCell>{row.produto}</TableCell>
                  <TableCell>{row.descricao}</TableCell>
                  <TableCell>{row.pedido}</TableCell>
                  <TableCell>{row.peso}</TableCell>
                  <TableCell>{row.data}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
