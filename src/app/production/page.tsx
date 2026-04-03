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

type ProductionTask = {
  id: string;
  orderNumber: string;
  orderId: string;
  materialName: string;
  description?: string;
  materialId: string;
  uom: string;
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
  onChangeClient,
  ...props
}: React.ComponentProps<typeof Input> & {
  value: string;
  onSave: (val: string) => void;
  onChangeClient?: (val: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(value);
  const [isFocused, setIsFocused] = React.useState(false);
  const focusStartValueRef = React.useRef(value);

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
        focusStartValueRef.current = value;
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
        onChangeClient?.(e.target.value);
        props.onChange?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (localValue !== focusStartValueRef.current) {
          onSave(localValue);
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
  const pendingTaskDraftsRef = React.useRef<Record<string, Partial<Pick<ProductionTask, 'producedQty' | 'producedWeight'>>>>({});
  const loadTasksRequestRef = React.useRef(0);
  const appliedLoadTasksRequestRef = React.useRef(0);
  const [serverTasks, setServerTasks] = React.useState<ProductionTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = React.useState<string | null>(null);
  const [busyLabelTaskId, setBusyLabelTaskId] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const tasksFingerprintRef = React.useRef('');

  const pruneTaskDraft = React.useCallback((task: ProductionTask) => {
    const draft = pendingTaskDraftsRef.current[task.id];
    if (!draft) return;

    const nextDraft = { ...draft };
    if (draft.producedQty === task.producedQty) delete nextDraft.producedQty;
    if (draft.producedWeight === task.producedWeight) delete nextDraft.producedWeight;

    if (Object.keys(nextDraft).length === 0) {
      delete pendingTaskDraftsRef.current[task.id];
      return;
    }

    pendingTaskDraftsRef.current[task.id] = nextDraft;
  }, []);

  const applyTaskDraft = React.useCallback((task: ProductionTask): ProductionTask => {
    const draft = pendingTaskDraftsRef.current[task.id];
    return draft ? { ...task, ...draft } : task;
  }, []);

  const loadTasks = React.useCallback(async (opts?: LoadTasksOptions) => {
    const requestId = ++loadTasksRequestRef.current;
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
      if (requestId < appliedLoadTasksRequestRef.current) {
        return;
      }
      appliedLoadTasksRequestRef.current = requestId;
      const items = (Array.isArray(data) ? data : []) as ProductionTask[];
      const mergedItems = items.map((task) => {
        pruneTaskDraft(task);
        return applyTaskDraft(task);
      });
      const nextFingerprint = JSON.stringify(mergedItems);
      if (nextFingerprint !== tasksFingerprintRef.current) {
        tasksFingerprintRef.current = nextFingerprint;
        setServerTasks(mergedItems);
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
  }, [applyTaskDraft, pruneTaskDraft]);

  React.useEffect(() => {
    loadTasks();
    const interval = setInterval(() => loadTasks({ skipLoading: true }), 30000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const updateTaskLocal = (taskId: string, field: 'producedQty' | 'producedWeight', value: number | undefined) => {
    pendingTaskDraftsRef.current[taskId] = {
      ...(pendingTaskDraftsRef.current[taskId] ?? {}),
      [field]: value,
    };
    setServerTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)));
  };

  const tasks = React.useMemo(() => {
    return [...serverTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverTasks]);

  const activeTasks = React.useMemo(() => tasks.filter((task) => task.status !== 'DONE'), [tasks]);
  const historyTasks = React.useMemo(() => tasks.filter((task) => task.status === 'DONE'), [tasks]);
  const usesMeasuredUom = React.useCallback((uom?: string) => {
    const normalized = String(uom ?? '').trim().toUpperCase();
    return normalized === 'KG' || normalized === 'M';
  }, []);
  const taskRequestedValue = React.useCallback((task: ProductionTask) => {
    if (usesMeasuredUom(task.uom)) {
      return Number(task.requestedWeight ?? task.qtyToProduce ?? 0);
    }
    return Number(task.qtyToProduce ?? 0);
  }, [usesMeasuredUom]);
  const taskProducedValue = React.useCallback((task: ProductionTask) => {
    if (usesMeasuredUom(task.uom)) {
      return task.producedWeight;
    }
    return task.producedQty;
  }, [usesMeasuredUom]);
  const taskProducedInputValue = React.useCallback((task: ProductionTask) => {
    const value = Number(taskProducedValue(task) ?? 0);
    return value > 0 ? String(value) : '';
  }, [taskProducedValue]);

  const validateTaskBeforeComplete = React.useCallback((task: ProductionTask) => {
    if (!taskProducedValue(task) || Number(taskProducedValue(task)) <= 0) {
      setError('Preencha o valor produzido antes de concluir.');
      return false;
    }
    if (!task.labelPrinted) {
      setError('Voce deve imprimir a etiqueta antes de concluir.');
      return false;
    }
    return true;
  }, [taskProducedValue]);

  const updateTaskProducedValue = React.useCallback((task: ProductionTask, value: number | undefined) => {
    const safeValue = value !== undefined && Number.isFinite(value) ? value : undefined;
    if (usesMeasuredUom(task.uom)) {
      updateTaskLocal(task.id, 'producedQty', safeValue);
      updateTaskLocal(task.id, 'producedWeight', safeValue);
      return;
    }
    updateTaskLocal(task.id, 'producedQty', safeValue);
    updateTaskLocal(task.id, 'producedWeight', undefined);
  }, [usesMeasuredUom]);

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

  const saveProducedValue = React.useCallback(async (task: ProductionTask, value: number | undefined) => {
    const safeValue = value !== undefined && Number.isFinite(value) ? value : undefined;
    if (usesMeasuredUom(task.uom)) {
      await saveMeta(task.id, safeValue, safeValue);
      return;
    }
    await saveMeta(task.id, safeValue, undefined);
  }, [saveMeta, usesMeasuredUom]);

  const handlePrintProductionLabel = async (task: ProductionTask) => {
    setError(null);
    setBusyLabelTaskId(task.id);
    const qty = Math.max(0, Number(task.qtyToProduce ?? 0));
    const producedValue = taskProducedValue(task) ?? qty;
    const pQty = producedValue;
    const pWeight = usesMeasuredUom(task.uom) ? producedValue : undefined;

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
          uom: task.uom ?? 'EA',
          color: task.color ?? '',
          shortageAction: 'PRODUCE',
          qtyRequested: qty,
          requestedWeight: task.requestedWeight,
          qtyReservedFromStock: 0,
          qtyToProduce: qty,
          qtySeparated: qty,
          producedQty: pQty,
          producedWeight: pWeight,
          separatedWeight: usesMeasuredUom(task.uom) ? producedValue : qty,
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
    return (
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
      <TableCell className="text-sm text-muted-foreground">
        <div className="space-y-1">
          <div>{task.description ?? task.materialName}</div>
          <div className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
            Solicitado: {taskRequestedValue(task)} {task.uom}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{task.color ?? ''}</TableCell>
      <TableCell className="text-right">{taskRequestedValue(task)} {task.uom}</TableCell>
      <TableCell className="p-1">
        <EditableInput
          type="number"
          step={usesMeasuredUom(task.uom) ? '0.01' : undefined}
          className="h-8 text-center"
          value={taskProducedInputValue(task)}
          placeholder={task.uom}
          onChangeClient={(value) => {
            const nextValue = value === '' ? undefined : Number(value);
            updateTaskProducedValue(task, Number.isFinite(nextValue as number) ? nextValue : undefined);
          }}
          onSave={(value) => {
            const nextValue = value === '' ? undefined : Number(value);
            const safeValue = Number.isFinite(nextValue as number) ? nextValue : undefined;
            updateTaskProducedValue(task, safeValue);
            void saveProducedValue(task, safeValue);
          }}
        />
      </TableCell>
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
    return (
      <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/5 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 dark:text-slate-100">{task.orderNumber}</p>
            {task.isMrp ? (
              <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                mrp
              </Badge>
            ) : null}
          </div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">{task.materialName}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300 mt-1">
            Solicitado: {taskRequestedValue(task)} {task.uom}
          </p>
          <p className="text-[10px] text-slate-500 italic">{task.description || task.materialName} {task.color ? `• ${task.color}` : ''}</p>
        </div>
        <Badge variant={task.status === 'DONE' ? 'positive' : task.status === 'IN_PROGRESS' ? 'warning' : 'outline'}>
          {productionTaskStatusLabel(task.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="flex flex-col items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2">
          <span className="text-[8px] uppercase font-bold text-slate-400">Solicitado</span>
          <span className="text-sm font-bold">{taskRequestedValue(task)} {task.uom}</span>
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <EditableInput
            type="number"
            step={usesMeasuredUom(task.uom) ? '0.01' : undefined}
            className="h-9 px-2 text-center text-xs font-bold"
            value={taskProducedInputValue(task)}
            placeholder={task.uom}
            onChangeClient={(value) => {
              const nextValue = value === '' ? undefined : Number(value);
              updateTaskProducedValue(task, Number.isFinite(nextValue as number) ? nextValue : undefined);
            }}
            onSave={(value) => {
              const nextValue = value === '' ? undefined : Number(value);
              const safeValue = Number.isFinite(nextValue as number) ? nextValue : undefined;
              updateTaskProducedValue(task, safeValue);
              void saveProducedValue(task, safeValue);
            }}
          />
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
                <TableHead className="text-right">Solicitado</TableHead>
                <TableHead className="text-center w-[120px]">Produzido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Carregando tarefas...
                  </TableCell>
                </TableRow>
              ) : activeTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="border-none py-8">
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
                      <TableHead className="text-right">Solicitado</TableHead>
                      <TableHead className="text-center w-[120px]">Produzido</TableHead>
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
