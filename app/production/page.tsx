'use client';

import * as React from 'react';
import { Factory, Star, FileText } from 'lucide-react';
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
import { generateLabelPdf } from '@/lib/domain/labels';
import type { Order } from '@/lib/domain/types';
import { EmptyState } from '@/components/ui/empty-state';
import { productionTaskStatusLabel } from '@/lib/domain/i18n';
import { notifyDataRefreshed } from '@/lib/data-refresh';

type ProductionTask = {
  id: string;
  orderNumber: string;
  orderId: string;
  materialName: string;
  description?: string;
  materialId: string;
  color?: string;
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

type LoadTasksOptions = {
  skipLoading?: boolean;
};

export default function ProductionPage() {
  const [serverTasks, setServerTasks] = React.useState<ProductionTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = React.useState<string | null>(null);
  const [busyLabelTaskId, setBusyLabelTaskId] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const tasksFingerprintRef = React.useRef('');

  const loadTasks = React.useCallback(async (opts?: LoadTasksOptions) => {
    const skipLoading = opts?.skipLoading;
    if (!skipLoading) {
      setLoading(true);
    }
    setError(null);
    let refreshed = false;
    try {
      const res = await fetch('/api/production', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      const data = (await res.json()) as unknown;
      const items = Array.isArray(data) ? data : [];
      const nextFingerprint = JSON.stringify(items);
      if (nextFingerprint !== tasksFingerprintRef.current) {
        tasksFingerprintRef.current = nextFingerprint;
        setServerTasks(items);
        refreshed = true;
      } else {
        refreshed = false;
      }
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao carregar tarefas de producao');
      setServerTasks([]);
      tasksFingerprintRef.current = '[]';
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
      if (refreshed) {
        notifyDataRefreshed();
      }
    }
  }, []);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      loadTasks({ skipLoading: true });
    }, 15000);
    return () => window.clearInterval(id);
  }, [loadTasks]);

  const tasks = React.useMemo(() => {
    return [...serverTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverTasks]);

  const activeTasks = React.useMemo(() => tasks.filter((task) => task.status === 'PENDING'), [tasks]);
  const historyTasks = React.useMemo(() => tasks.filter((task) => task.status !== 'PENDING'), [tasks]);

  const mutateTask = async (taskId: string, action: 'start' | 'complete') => {
    try {
      setBusyTaskId(taskId);
      const res = await fetch(`/api/production/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      await loadTasks({ skipLoading: true });
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao atualizar tarefa');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handlePrintProductionLabel = async (task: ProductionTask) => {
    setError(null);
    setBusyLabelTaskId(task.id);
    const qty = Math.max(0, Number(task.qtyToProduce ?? 0));
    const orderDate = task.createdAt ?? new Date().toISOString();
    const dueDate = task.updatedAt ?? orderDate;
    const labelOrder: Order = {
      id: task.orderId,
      orderNumber: task.orderNumber,
      clientId: '',
      clientName: '',
      status: 'ABERTO',
      readiness: 'NOT_READY',
      orderDate,
      dueDate,
      createdBy: '',
      pickerId: undefined,
      volumeCount: 1,
      items: [
        {
          id: `${task.id}-item`,
          materialId: task.materialId,
          materialName: task.materialName,
          description: task.description ?? task.materialName,
          uom: 'EA',
          color: task.color ?? '',
          shortageAction: 'PRODUCE',
          qtyRequested: qty,
          qtyReservedFromStock: 0,
          qtyToProduce: qty,
          qtySeparated: qty,
          separatedWeight: qty,
          conditions: [],
        },
      ],
      auditTrail: [],
      labelPrintCount: 0,
      total: 0,
      trashedAt: null,
    };
    try {
      await generateLabelPdf(labelOrder, undefined, 'PRODUCTION_4x4');
      const res = await fetch(`/api/orders/${task.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_label_print', format: 'PRODUCTION_4x4' }),
      });
      if (!res.ok) throw new Error(`Falha ao registrar etiqueta (${res.status})`);
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao imprimir etiqueta');
    } finally {
      setBusyLabelTaskId(null);
    }
  };

  const renderTaskRow = (task: ProductionTask) => (
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
      <TableCell className="text-sm text-muted-foreground">{task.description ?? task.materialName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{task.color ?? ''}</TableCell>
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
            disabled={busyLabelTaskId === task.id || busyTaskId === task.id}
            onClick={() => handlePrintProductionLabel(task)}
          >
            <FileText className="mr-1 h-3 w-3" />
            Etiqueta 4x4
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-headline flex items-center gap-2"><Factory className="h-5 w-5" /> Producao</CardTitle>
            <CardDescription>
              Tarefas de producao persistidas no banco. Concluir reserva automaticamente o estoque produzido por 5 minutos antes de liberar para o picking.
            </CardDescription>
          </div>
          <p className="text-xs text-muted-foreground">Dados atualizados automaticamente.</p>
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
              <TableHead>Desc</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead className="text-right">Qtd. para produzir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Carregando tarefas...
                </TableCell>
              </TableRow>
            ) : activeTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="border-none py-8">
                  <EmptyState
                    icon={Factory}
                    title="Sem tarefas pendentes"
                    description="As tarefas iniciadas ou concluidas ficam guardadas no histórico."
                    className="min-h-[120px]"
                  />
                </TableCell>
              </TableRow>
            ) : (
              activeTasks.map(renderTaskRow)
            )}
          </TableBody>
        </Table>
      </CardContent>
      {historyTasks.length > 0 && (
        <CardContent className="pt-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Histórico de produção</p>
              <p className="text-xs text-muted-foreground">
                Tarefas iniciadas ou concluídas continuam disponíveis aqui.
              </p>
            </div>
            <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => setShowHistory((prev) => !prev)}>
              {showHistory ? 'Ocultar histórico' : 'Ver histórico'} ({historyTasks.length})
            </Button>
          </div>
          {showHistory ? (
            <div className="mt-3 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Desc</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead className="text-right">Qtd. para produzir</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyTasks.map(renderTaskRow)}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Clique para expandir e revisar as tarefas já iniciadas ou finalizadas.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
