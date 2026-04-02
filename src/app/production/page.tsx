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
import { Input } from '@/components/ui/input';
import { quantityEnabled, weightEnabled } from '@/features/tenant-operation-mode/helpers';

type ProductionTask = {
  id: string;
  orderNumber: string;
  orderId: string;
  operationMode?: 'QUANTITY' | 'WEIGHT' | 'BOTH';
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
  conditions?: { key: string; value: string }[];
  requestedWeight?: number;
  producedQty?: number;
  producedWeight?: number;
  labelPrinted?: boolean;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

function EditableInput({
  value,
  onSave,
  ...props
}: React.ComponentProps<typeof Input> & {
  value: string;
  onSave: (val: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(value);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  return (
    <Input
      {...props}
      value={localValue}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
        props.onChange?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (localValue !== value) {
          onSave(e.target.value);
        }
        props.onBlur?.(e);
      }}
    />
  );
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
    const interval = setInterval(() => loadTasks({ skipLoading: true }), 30000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const updateTaskLocal = (taskId: string, field: 'producedQty' | 'producedWeight', value: number | undefined) => {
    setServerTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)));
  };

  const tasks = React.useMemo(() => {
    return [...serverTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverTasks]);

  const activeTasks = React.useMemo(() => tasks.filter((task) => task.status !== 'DONE'), [tasks]);
  const historyTasks = React.useMemo(() => tasks.filter((task) => task.status === 'DONE'), [tasks]);
  const showProducedQty = React.useMemo(
    () => tasks.some((task) => quantityEnabled(task.operationMode ?? 'BOTH')),
    [tasks]
  );
  const showProducedWeight = React.useMemo(
    () => tasks.some((task) => weightEnabled(task.operationMode ?? 'BOTH')),
    [tasks]
  );
  const operationModeLabel = (mode: ProductionTask['operationMode']) =>
    mode === 'WEIGHT' ? 'Peso' : mode === 'QUANTITY' ? 'Quantidade' : 'Qtd + Peso';

  const validateTaskBeforeComplete = React.useCallback((task: ProductionTask) => {
    const taskOperationMode = task.operationMode ?? 'BOTH';
    if (taskOperationMode === 'BOTH' && (!task.producedQty || !task.producedWeight)) {
      setError('Preencha quantidade e peso produzidos antes de concluir.');
      return false;
    }
    if (quantityEnabled(taskOperationMode) && !task.producedQty) {
      setError('Preencha a quantidade produzida antes de concluir.');
      return false;
    }
    if (weightEnabled(taskOperationMode) && !task.producedWeight) {
      setError('Preencha o peso produzido antes de concluir.');
      return false;
    }
    if (!task.labelPrinted) {
      setError('Voce deve imprimir a etiqueta antes de concluir.');
      return false;
    }
    return true;
  }, []);

  const mutateTask = async (taskId: string, action: 'start' | 'complete') => {
    try {
      setBusyTaskId(taskId);
      const res = await fetch(`/api/production/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }
      await loadTasks({ skipLoading: true });
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao atualizar tarefa');
    } finally {
      setBusyTaskId(null);
    }
  };

  const saveMeta = async (taskId: string, producedQty?: number, producedWeight?: number) => {
    try {
      setBusyTaskId(taskId);
      const res = await fetch(`/api/production/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_produced', producedQty, producedWeight }),
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      await loadTasks({ skipLoading: true });
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao salvar dados de producao');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handlePrintProductionLabel = async (task: ProductionTask) => {
    setError(null);
    setBusyLabelTaskId(task.id);
    const qty = Math.max(0, Number(task.qtyToProduce ?? 0));
    const pQty = task.producedQty ?? qty;
    const pWeight = task.producedWeight;

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
          requestedWeight: task.requestedWeight,
          qtyReservedFromStock: 0,
          qtyToProduce: qty,
          qtySeparated: qty,
          producedQty: pQty,
          producedWeight: pWeight,
          separatedWeight: qty,
          conditions: task.conditions ?? [],
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

      const taskRes = await fetch(`/api/production/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_label_print' }),
      });
      if (!taskRes.ok) throw new Error(`Falha ao registrar etiqueta na tarefa (${taskRes.status})`);

      await loadTasks({ skipLoading: true });
    } catch (err: unknown) {
      setError(errorMessage(err) || 'Falha ao imprimir etiqueta');
    } finally {
      setBusyLabelTaskId(null);
    }
  };

  const renderTaskRow = (task: ProductionTask) => {
    const taskOperationMode = task.operationMode ?? 'BOTH';
    const taskShowQty = quantityEnabled(taskOperationMode);
    const taskShowWeight = weightEnabled(taskOperationMode);

    return (
      <TableRow key={task.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{task.orderNumber}</span>
          <Badge variant="outline" className="px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
            {operationModeLabel(taskOperationMode)}
          </Badge>
          {task.isMrp ? (
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]">
              <Star className="h-3 w-3 text-amber-500" />
              mrp
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{task.materialName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <div className="space-y-1">
          <div>{task.description ?? task.materialName}</div>
          {task.requestedWeight ? (
            <div className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
              Peso solicitado: {task.requestedWeight}
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{task.color ?? ''}</TableCell>
      <TableCell className="text-right">{task.qtyToProduce}</TableCell>
      {showProducedQty ? (
        <TableCell className="p-1">
          {taskShowQty ? (
            <EditableInput
              type="number"
              className="h-8 text-center"
              value={String(task.producedQty ?? '')}
              placeholder="Qtd."
              onSave={(value) => {
                const nextQty = value === '' ? undefined : Number(value);
                updateTaskLocal(task.id, 'producedQty', nextQty);
                saveMeta(task.id, nextQty, task.producedWeight);
              }}
            />
          ) : <span className="block text-center text-xs text-muted-foreground">-</span>}
        </TableCell>
      ) : null}
      {showProducedWeight ? (
        <TableCell className="p-1">
          {taskShowWeight ? (
            <EditableInput
              type="number"
              step="0.01"
              className="h-8 text-center"
              value={String(task.producedWeight ?? '')}
              placeholder="Peso"
              onSave={(value) => {
                const nextWeight = value === '' ? undefined : Number(value);
                updateTaskLocal(task.id, 'producedWeight', nextWeight);
                saveMeta(task.id, task.producedQty, nextWeight);
              }}
            />
          ) : <span className="block text-center text-xs text-muted-foreground">-</span>}
        </TableCell>
      ) : null}
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
            disabled={task.status === 'DONE' || busyTaskId === task.id}
            onClick={() => {
              if (!validateTaskBeforeComplete(task)) {
                return;
              }
              mutateTask(task.id, 'complete');
            }}
          >
            Concluir
          </Button>
          <Button
            size="sm"
            variant={task.labelPrinted ? 'outline' : 'default'}
            disabled={busyLabelTaskId === task.id || busyTaskId === task.id}
            onClick={() => handlePrintProductionLabel(task)}
          >
            <FileText className="mr-1 h-3 w-3" />
            {task.labelPrinted ? 'Reimprimir' : 'Imprimir'} Etiqueta de Producao
          </Button>
        </div>
      </TableCell>
      </TableRow>
    );
  };

  const renderTaskCard = (task: ProductionTask) => {
    const taskOperationMode = task.operationMode ?? 'BOTH';
    const taskShowQty = quantityEnabled(taskOperationMode);
    const taskShowWeight = weightEnabled(taskOperationMode);

    return (
      <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/5 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 dark:text-slate-100">{task.orderNumber}</p>
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
              {operationModeLabel(taskOperationMode)}
            </Badge>
            {task.isMrp ? (
              <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                mrp
              </Badge>
            ) : null}
          </div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">{task.materialName}</p>
          {task.requestedWeight ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300 mt-1">
              Peso solicitado: {task.requestedWeight}
            </p>
          ) : null}
          <p className="text-[10px] text-slate-500 italic">{task.description || task.materialName} {task.color ? `• ${task.color}` : ''}</p>
        </div>
        <Badge variant={task.status === 'DONE' ? 'positive' : task.status === 'IN_PROGRESS' ? 'warning' : 'outline'}>
          {productionTaskStatusLabel(task.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="flex flex-col items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2">
          <span className="text-[8px] uppercase font-bold text-slate-400">Solicitado</span>
          <span className="text-sm font-bold">{task.qtyToProduce}</span>
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <div className={`grid gap-2 ${taskShowQty && taskShowWeight ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {taskShowQty ? (
              <EditableInput
                type="number"
                className="h-9 px-2 text-center text-xs font-bold"
                value={String(task.producedQty ?? '')}
                placeholder="Qtd."
                onSave={(value) => {
                  const nextQty = value === '' ? undefined : Number(value);
                  updateTaskLocal(task.id, 'producedQty', nextQty);
                  saveMeta(task.id, nextQty, task.producedWeight);
                }}
              />
            ) : null}
            {taskShowWeight ? (
              <EditableInput
                type="number"
                step="0.01"
                className="h-9 px-2 text-center text-xs font-bold"
                value={String(task.producedWeight ?? '')}
                placeholder="Peso"
                onSave={(value) => {
                  const nextWeight = value === '' ? undefined : Number(value);
                  updateTaskLocal(task.id, 'producedWeight', nextWeight);
                  saveMeta(task.id, task.producedQty, nextWeight);
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-9 font-bold text-xs"
            disabled={task.status === 'DONE' || busyTaskId === task.id}
            onClick={() => {
              if (!validateTaskBeforeComplete(task)) {
                return;
              }
              mutateTask(task.id, 'complete');
            }}
          >
            Concluir
          </Button>
        </div>
        <Button
          size="sm"
          variant={task.labelPrinted ? 'outline' : 'default'}
          className="w-full h-9 font-bold text-xs"
          disabled={busyLabelTaskId === task.id || busyTaskId === task.id}
          onClick={() => handlePrintProductionLabel(task)}
        >
          <FileText className="mr-2 h-4 w-4" />
          {task.labelPrinted ? 'Reimprimir' : 'Imprimir'} Etiqueta de Producao
        </Button>
      </div>

      <div className="flex justify-between items-center mt-1 text-[9px] uppercase tracking-tighter text-muted-foreground/60">
        <span>ID: {task.id.slice(0, 8)}</span>
        <span>Atualizado: {formatDate(task.updatedAt)}</span>
      </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-headline flex items-center gap-2"><Factory className="h-5 w-5" /> Producao</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Tarefas de producao persistidas no banco. Concluir libera para o picking.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {error ? (
        <CardHeader className="pt-0">
          <CardDescription className="text-destructive font-bold text-xs bg-destructive/10 p-2 rounded-lg border border-destructive/20">{error}</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent>
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Desc</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead className="text-right">{showProducedWeight && showProducedQty ? 'Solicitado' : 'Qtd Solic.'}</TableHead>
                {showProducedQty ? <TableHead className="text-center w-[100px]">{showProducedWeight ? 'Qtd Produz.' : 'Qtd Prod.'}</TableHead> : null}
                {showProducedWeight ? <TableHead className="text-center w-[100px]">{showProducedQty ? 'Peso Prod.' : 'Peso (KG)'}</TableHead> : null}
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={showProducedQty && showProducedWeight ? 10 : 9} className="py-8 text-center text-muted-foreground">
                    Carregando tarefas...
                  </TableCell>
                </TableRow>
              ) : activeTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showProducedQty && showProducedWeight ? 10 : 9} className="border-none py-8">
                    <EmptyState
                      icon={Factory}
                      title="Sem tarefas pendentes"
                      description="As tarefas iniciadas ou concluidas ficam guardadas no historico."
                      className="min-h-[120px]"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                activeTasks.map((task) => renderTaskRow(task))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 gap-4 md:hidden">
          {loading ? (
            <EmptyState title="Carregando..." description="Buscando tarefas de producao." className="min-h-[120px]" />
          ) : activeTasks.length === 0 ? (
            <EmptyState icon={Factory} title="Fila Limpa" description="Sem tarefas pendentes no momento." className="min-h-[120px]" />
          ) : (
            activeTasks.map((task) => renderTaskCard(task))
          )}
        </div>
      </CardContent>

      {historyTasks.length > 0 ? (
        <CardContent className="pt-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-0 sm:px-4 py-2 bg-muted/20 rounded-xl border border-muted/50">
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Historico de producao</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {historyTasks.length} tarefas finalizadas
              </p>
            </div>
            <Button className="w-full sm:w-auto h-9 font-bold text-xs" variant="outline" onClick={() => setShowHistory((prev) => !prev)}>
              {showHistory ? 'Ocultar historico' : 'Ver historico'}
            </Button>
          </div>
          {showHistory ? (
            <div className="mt-4 space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {historyTasks.map((task) => renderTaskCard(task))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Desc</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead className="text-right">{showProducedWeight && showProducedQty ? 'Solicitado' : 'Qtd Solic.'}</TableHead>
                      {showProducedQty ? <TableHead className="text-center w-[100px]">{showProducedWeight ? 'Qtd Produz.' : 'Qtd Prod.'}</TableHead> : null}
                      {showProducedWeight ? <TableHead className="text-center w-[100px]">{showProducedQty ? 'Peso Prod.' : 'Peso (KG)'}</TableHead> : null}
                      <TableHead>Status</TableHead>
                      <TableHead>Atualizado</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyTasks.map((task) => renderTaskRow(task))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
