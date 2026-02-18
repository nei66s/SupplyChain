'use client';

import * as React from 'react';
import { Factory, Star } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { productionTaskStatusLabel } from '@/lib/domain/i18n';

type ProductionTask = {
  id: string;
  orderNumber: string;
  materialName: string;
  qtyToProduce: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  updatedAt: string;
  createdAt: string;
  isMrp?: boolean;
  pendingReceiptId?: string | null;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

export default function ProductionPage() {
  const [serverTasks, setServerTasks] = React.useState<ProductionTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = React.useState<string | null>(null);

  const loadTasks = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/production', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      const data = await res.json();
      setServerTasks(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao carregar tarefas de producao');
      setServerTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const tasks = React.useMemo(() => {
    return [...serverTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverTasks]);

  const mutateTask = async (taskId: string, action: 'start' | 'complete') => {
    try {
      setBusyTaskId(taskId);
      const res = await fetch(`/api/production/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      await loadTasks();
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao atualizar tarefa');
    } finally {
      setBusyTaskId(null);
    }
  };

  const approveAllocation = async (task: ProductionTask) => {
    if (!task.pendingReceiptId) return;
    try {
      setBusyTaskId(task.id);
      const res = await fetch(`/api/receipts/${task.pendingReceiptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post', autoAllocate: true }),
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      await loadTasks();
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao aprovar alocacao');
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="font-headline flex items-center gap-2"><Factory className="h-5 w-5" /> Producao</CardTitle>
            <CardDescription>
              Tarefas de producao persistidas no banco. Concluir cria aprovacao pendente de alocacao do estoque.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => loadTasks()} disabled={loading}>
            Recarregar
          </Button>
        </div>
      </CardHeader>
      {error ? (
        <CardHeader className="pt-0">
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      ) : null}
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Carregando tarefas...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="border-none py-8">
                  <EmptyState icon={Factory} title="Sem tarefas de producao" description="Crie pedidos para gerar tarefas ou adicione tarefas na tabela production_tasks." className="min-h-[120px]" />
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{task.orderNumber}</span>
                      {task.isMrp ? (
                        <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]">
                          <Star className="h-3 w-3 text-amber-500" />
                          mrp
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
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
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={task.status !== 'PENDING' || busyTaskId === task.id}
                        onClick={() => mutateTask(task.id, 'start')}
                      >
                        Iniciar
                      </Button>
                      <Button
                        size="sm"
                        disabled={task.status === 'DONE' || busyTaskId === task.id}
                        onClick={() => mutateTask(task.id, 'complete')}
                      >
                        Concluir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={task.status !== 'DONE' || !task.pendingReceiptId || busyTaskId === task.id}
                        onClick={() => approveAllocation(task)}
                      >
                        Aprovar alocacao
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
