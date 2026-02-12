'use client';

import { Factory } from 'lucide-react';
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
import { usePilotStore } from '@/lib/pilot/store';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { productionTaskStatusLabel } from '@/lib/pilot/i18n';

export default function ProductionPage() {
  const db = usePilotStore((state) => state.db);
  const startProductionTask = usePilotStore((state) => state.startProductionTask);
  const completeProduction = usePilotStore((state) => state.completeProduction);

  const tasks = [...db.productionTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Factory className="h-5 w-5" /> Producao</CardTitle>
        <CardDescription>
          Tarefas geradas automaticamente por quantidade para produzir. Concluir tarefa gera recebimento em rascunho (sem entrada direta no estoque).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Qtd. para produzir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="border-none py-8">
                  <EmptyState icon={Factory} title="Sem tarefas de producao" description="Novas demandas de producao aparecerao aqui automaticamente." className="min-h-[120px]" />
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.orderNumber}</TableCell>
                  <TableCell>{task.materialName}</TableCell>
                  <TableCell className="text-right">{task.qtyToProduce}</TableCell>
                  <TableCell>
                    <Badge variant={task.status === 'DONE' ? 'positive' : task.status === 'IN_PROGRESS' ? 'warning' : 'outline'}>
                      {productionTaskStatusLabel(task.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(task.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" disabled={task.status !== 'PENDING'} onClick={() => startProductionTask(task.id)}>
                        Iniciar
                      </Button>
                      <Button size="sm" disabled={task.status === 'DONE'} onClick={() => completeProduction(task.id)}>
                        Concluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
